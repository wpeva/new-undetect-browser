/**
 * VM Image Manager
 * Session 6: Hardware Virtualization Setup
 *
 * Manages VM image templates and base images
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { VMImageTemplate, OSType } from '../types';

const execAsync = promisify(exec);

export class ImageManager {
  private baseImageDir: string;
  private templates: Map<string, VMImageTemplate> = new Map();

  constructor(baseImageDir: string = '/var/lib/undetect-browser/vm/images') {
    this.baseImageDir = baseImageDir;
  }

  /**
   * Initialize image manager
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.baseImageDir, { recursive: true });
    await this.loadTemplates();
  }

  /**
   * Create a new VM image from ISO
   */
  async createImage(options: {
    name: string;
    osType: OSType;
    isoPath: string;
    diskSizeGB: number;
    description?: string;
  }): Promise<VMImageTemplate> {
    const imageId = this.generateImageId();
    const imagePath = path.join(this.baseImageDir, `${imageId}.qcow2`);

    console.log(`Creating image: ${options.name} (${imageId})`);

    // Create QCOW2 image
    await execAsync(`qemu-img create -f qcow2 ${imagePath} ${options.diskSizeGB}G`);

    // Calculate image size
    const stats = await fs.stat(imagePath);

    const template: VMImageTemplate = {
      id: imageId,
      name: options.name,
      osType: options.osType,
      version: this.extractVersionFromName(options.name),
      imagePath,
      description: options.description,
      minRamGB: this.getMinRAMForOS(options.osType),
      minDiskGB: options.diskSizeGB,
      recommendedCPUCores: this.getRecommendedCPUCores(options.osType),
      created: new Date(),
      size: stats.size
    };

    this.templates.set(imageId, template);
    await this.saveTemplates();

    return template;
  }

  /**
   * Import existing image
   */
  async importImage(options: {
    name: string;
    osType: OSType;
    imagePath: string;
    description?: string;
  }): Promise<VMImageTemplate> {
    const imageId = this.generateImageId();
    const targetPath = path.join(this.baseImageDir, `${imageId}.qcow2`);

    // Copy or convert image to QCOW2
    const sourceFormat = await this.detectImageFormat(options.imagePath);

    if (sourceFormat === 'qcow2') {
      await fs.copyFile(options.imagePath, targetPath);
    } else {
      await execAsync(`qemu-img convert -f ${sourceFormat} -O qcow2 ${options.imagePath} ${targetPath}`);
    }

    // Get image info
    const imageInfo = await this.getImageInfo(targetPath);
    const stats = await fs.stat(targetPath);

    const template: VMImageTemplate = {
      id: imageId,
      name: options.name,
      osType: options.osType,
      version: this.extractVersionFromName(options.name),
      imagePath: targetPath,
      description: options.description,
      minRamGB: this.getMinRAMForOS(options.osType),
      minDiskGB: Math.ceil(imageInfo.virtualSize / (1024 ** 3)),
      recommendedCPUCores: this.getRecommendedCPUCores(options.osType),
      created: new Date(),
      size: stats.size
    };

    this.templates.set(imageId, template);
    await this.saveTemplates();

    return template;
  }

  /**
   * Create snapshot of an image
   */
  async createSnapshot(imageId: string, snapshotName: string): Promise<void> {
    const template = this.templates.get(imageId);
    if (!template) {
      throw new Error(`Image template ${imageId} not found`);
    }

    await execAsync(`qemu-img snapshot -c ${snapshotName} ${template.imagePath}`);
    template.snapshotName = snapshotName;
    await this.saveTemplates();
  }

  /**
   * Restore image from snapshot
   */
  async restoreSnapshot(imageId: string, snapshotName: string): Promise<void> {
    const template = this.templates.get(imageId);
    if (!template) {
      throw new Error(`Image template ${imageId} not found`);
    }

    await execAsync(`qemu-img snapshot -a ${snapshotName} ${template.imagePath}`);
  }

  /**
   * List all snapshots for an image
   */
  async listSnapshots(imageId: string): Promise<Array<{
    name: string;
    size: number;
    date: string;
  }>> {
    const template = this.templates.get(imageId);
    if (!template) {
      throw new Error(`Image template ${imageId} not found`);
    }

    try {
      const { stdout } = await execAsync(`qemu-img snapshot -l ${template.imagePath}`);
      const lines = stdout.split('\n').slice(2); // Skip header

      return lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            name: parts[1],
            size: parseInt(parts[2]),
            date: parts.slice(3).join(' ')
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Clone an image template
   */
  async cloneImage(imageId: string, newName: string): Promise<VMImageTemplate> {
    const source = this.templates.get(imageId);
    if (!source) {
      throw new Error(`Image template ${imageId} not found`);
    }

    const newImageId = this.generateImageId();
    const newImagePath = path.join(this.baseImageDir, `${newImageId}.qcow2`);

    // Create linked clone (CoW)
    await execAsync(
      `qemu-img create -f qcow2 -F qcow2 -b ${source.imagePath} ${newImagePath}`
    );

    const stats = await fs.stat(newImagePath);

    const template: VMImageTemplate = {
      ...source,
      id: newImageId,
      name: newName,
      imagePath: newImagePath,
      created: new Date(),
      size: stats.size
    };

    this.templates.set(newImageId, template);
    await this.saveTemplates();

    return template;
  }

  /**
   * Delete image template
   */
  async deleteImage(imageId: string): Promise<void> {
    const template = this.templates.get(imageId);
    if (!template) {
      throw new Error(`Image template ${imageId} not found`);
    }

    // Delete image file
    await fs.unlink(template.imagePath);

    // Remove from templates
    this.templates.delete(imageId);
    await this.saveTemplates();
  }

  /**
   * Get image template
   */
  getTemplate(imageId: string): VMImageTemplate | undefined {
    return this.templates.get(imageId);
  }

  /**
   * List all image templates
   */
  listTemplates(osType?: OSType): VMImageTemplate[] {
    const templates = Array.from(this.templates.values());

    if (osType) {
      return templates.filter(t => t.osType === osType);
    }

    return templates;
  }

  /**
   * Compact image (reduce file size)
   */
  async compactImage(imageId: string): Promise<void> {
    const template = this.templates.get(imageId);
    if (!template) {
      throw new Error(`Image template ${imageId} not found`);
    }

    const tempPath = `${template.imagePath}.compact`;

    await execAsync(`qemu-img convert -O qcow2 -c ${template.imagePath} ${tempPath}`);
    await fs.rename(tempPath, template.imagePath);

    // Update size
    const stats = await fs.stat(template.imagePath);
    template.size = stats.size;
    await this.saveTemplates();
  }

  /**
   * Resize image
   */
  async resizeImage(imageId: string, newSizeGB: number): Promise<void> {
    const template = this.templates.get(imageId);
    if (!template) {
      throw new Error(`Image template ${imageId} not found`);
    }

    await execAsync(`qemu-img resize ${template.imagePath} ${newSizeGB}G`);

    template.minDiskGB = newSizeGB;
    const stats = await fs.stat(template.imagePath);
    template.size = stats.size;
    await this.saveTemplates();
  }

  /**
   * Get image info
   */
  private async getImageInfo(imagePath: string): Promise<{
    format: string;
    virtualSize: number;
    diskSize: number;
  }> {
    const { stdout } = await execAsync(`qemu-img info --output=json ${imagePath}`);
    const info = JSON.parse(stdout);

    return {
      format: info.format,
      virtualSize: info['virtual-size'],
      diskSize: info['disk-size']
    };
  }

  /**
   * Detect image format
   */
  private async detectImageFormat(imagePath: string): Promise<string> {
    const info = await this.getImageInfo(imagePath);
    return info.format;
  }

  /**
   * Load templates from disk
   */
  private async loadTemplates(): Promise<void> {
    const templatesPath = path.join(this.baseImageDir, 'templates.json');

    try {
      const data = await fs.readFile(templatesPath, 'utf-8');
      const templates: VMImageTemplate[] = JSON.parse(data);

      this.templates.clear();
      templates.forEach(template => {
        this.templates.set(template.id, {
          ...template,
          created: new Date(template.created)
        });
      });
    } catch {
      // No templates file exists yet
    }
  }

  /**
   * Save templates to disk
   */
  private async saveTemplates(): Promise<void> {
    const templatesPath = path.join(this.baseImageDir, 'templates.json');
    const templates = Array.from(this.templates.values());

    await fs.writeFile(templatesPath, JSON.stringify(templates, null, 2));
  }

  /**
   * Helper: Generate unique image ID
   */
  private generateImageId(): string {
    return `img-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Helper: Extract version from name
   */
  private extractVersionFromName(name: string): string {
    const versionMatch = name.match(/(\d+(?:\.\d+)*)/);
    return versionMatch ? versionMatch[1] : '1.0';
  }

  /**
   * Helper: Get minimum RAM for OS
   */
  private getMinRAMForOS(osType: OSType): number {
    const ramMap: Record<OSType, number> = {
      'windows11': 4,
      'windows10': 2,
      'ubuntu22': 2,
      'ubuntu20': 2,
      'macos-ventura': 8,
      'macos-monterey': 8
    };

    return ramMap[osType] || 2;
  }

  /**
   * Helper: Get recommended CPU cores for OS
   */
  private getRecommendedCPUCores(osType: OSType): number {
    const coresMap: Record<OSType, number> = {
      'windows11': 4,
      'windows10': 2,
      'ubuntu22': 2,
      'ubuntu20': 2,
      'macos-ventura': 4,
      'macos-monterey': 4
    };

    return coresMap[osType] || 2;
  }
}

export default ImageManager;
