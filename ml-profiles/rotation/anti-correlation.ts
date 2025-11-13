/**
 * Anti-Correlation Module
 *
 * Ensures browser profiles are statistically independent and cannot be linked together.
 * Prevents fingerprint clustering and cross-session correlation.
 */

import { ProfileGenerator, Profile, Fingerprint } from '../generator/fingerprint-generator';

export class AntiCorrelation {
  private generator: ProfileGenerator;
  private minDissimilarity: number;
  private maxAttempts: number;

  constructor(generator: ProfileGenerator, minDissimilarity: number = 0.7, maxAttempts: number = 100) {
    this.generator = generator;
    this.minDissimilarity = minDissimilarity;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Generate profile that is uncorrelated with existing profiles
   */
  async generateUncorrelated(existingProfiles: Profile[]): Promise<Profile> {
    if (existingProfiles.length === 0) {
      return await this.generator.generate();
    }

    let attempts = 0;
    let bestProfile: Profile | null = null;
    let bestDissimilarity = 0;

    while (attempts < this.maxAttempts) {
      const candidate = await this.generator.generate();

      // Calculate dissimilarity with all existing profiles
      const dissimilarity = this.calculateMinDissimilarity(candidate, existingProfiles);

      // Accept if sufficiently different
      if (dissimilarity >= this.minDissimilarity) {
        return candidate;
      }

      // Track best candidate
      if (dissimilarity > bestDissimilarity) {
        bestProfile = candidate;
        bestDissimilarity = dissimilarity;
      }

      attempts++;
    }

    // If we couldn't find sufficiently different profile, use best candidate
    if (bestProfile) {
      console.warn(
        `Could not generate profile with ${this.minDissimilarity} dissimilarity ` +
        `after ${this.maxAttempts} attempts. Using best: ${bestDissimilarity.toFixed(2)}`
      );
      return bestProfile;
    }

    // Fallback: just return a random profile
    return await this.generator.generate();
  }

  /**
   * Calculate minimum dissimilarity between candidate and existing profiles
   */
  private calculateMinDissimilarity(candidate: Profile, existing: Profile[]): number {
    const dissimilarities = existing.map((profile) =>
      this.calculateDissimilarity(candidate, profile)
    );

    return Math.min(...dissimilarities);
  }

  /**
   * Calculate dissimilarity (inverse of similarity) between two profiles
   */
  calculateDissimilarity(profile1: Profile, profile2: Profile): number {
    const similarity = this.calculateSimilarity(profile1.fingerprint, profile2.fingerprint);
    return 1 - similarity;
  }

  /**
   * Calculate similarity between two fingerprints (0 = different, 1 = identical)
   */
  calculateSimilarity(fp1: Fingerprint, fp2: Fingerprint): number {
    const features: Array<{
      weight: number;
      score: number;
    }> = [];

    // Screen resolution (weight: 0.15)
    features.push({
      weight: 0.15,
      score: this.screenSimilarity(fp1.screen, fp2.screen)
    });

    // Hardware specs (weight: 0.15)
    features.push({
      weight: 0.15,
      score: this.hardwareSimilarity(fp1.navigator, fp2.navigator)
    });

    // GPU/WebGL (weight: 0.20)
    features.push({
      weight: 0.20,
      score: this.webglSimilarity(fp1.webgl, fp2.webgl)
    });

    // Platform/OS (weight: 0.15)
    features.push({
      weight: 0.15,
      score: fp1.navigator.platform === fp2.navigator.platform ? 1 : 0
    });

    // Language (weight: 0.10)
    features.push({
      weight: 0.10,
      score: this.languageSimilarity(fp1.navigator.languages, fp2.navigator.languages)
    });

    // Fonts (weight: 0.15)
    features.push({
      weight: 0.15,
      score: this.fontSimilarity(fp1.fonts, fp2.fonts)
    });

    // Canvas fingerprint (weight: 0.10)
    features.push({
      weight: 0.10,
      score: fp1.canvas.hash === fp2.canvas.hash ? 1 : 0
    });

    // Calculate weighted average
    const totalWeight = features.reduce((sum, f) => sum + f.weight, 0);
    const weightedSum = features.reduce((sum, f) => sum + f.weight * f.score, 0);

    return weightedSum / totalWeight;
  }

  /**
   * Screen similarity
   */
  private screenSimilarity(s1: any, s2: any): number {
    if (s1.width === s2.width && s1.height === s2.height) {
      return 1;
    }

    // Partial similarity if aspect ratio is same
    const ratio1 = s1.width / s1.height;
    const ratio2 = s2.width / s2.height;

    if (Math.abs(ratio1 - ratio2) < 0.1) {
      return 0.5;
    }

    return 0;
  }

  /**
   * Hardware similarity (CPU, RAM)
   */
  private hardwareSimilarity(n1: any, n2: any): number {
    let score = 0;
    let count = 0;

    // CPU cores
    if (n1.hardwareConcurrency === n2.hardwareConcurrency) {
      score += 1;
    }
    count++;

    // RAM
    if (n1.deviceMemory === n2.deviceMemory) {
      score += 1;
    }
    count++;

    return score / count;
  }

  /**
   * WebGL similarity
   */
  private webglSimilarity(w1: any, w2: any): number {
    let score = 0;
    let count = 0;

    // Vendor
    if (w1.vendor === w2.vendor) {
      score += 1;
    }
    count++;

    // Renderer (most important for GPU detection)
    if (w1.renderer === w2.renderer) {
      score += 2;  // Double weight
    }
    count += 2;

    return score / count;
  }

  /**
   * Language similarity
   */
  private languageSimilarity(l1: string[], l2: string[]): number {
    // Check if primary language matches
    if (l1[0] === l2[0]) {
      return 1;
    }

    // Check if any language overlaps
    const overlap = l1.filter((lang) => l2.includes(lang)).length;
    return overlap / Math.max(l1.length, l2.length);
  }

  /**
   * Font similarity (Jaccard index)
   */
  private fontSimilarity(f1: string[], f2: string[]): number {
    const set1 = new Set(f1);
    const set2 = new Set(f2);

    // Intersection
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    // Union
    const union = new Set([...set1, ...set2]);

    // Jaccard index
    return intersection.size / union.size;
  }

  /**
   * Analyze profile cluster (detect if profiles are clustered)
   */
  analyzeCluster(profiles: Profile[]): {
    avgSimilarity: number;
    maxSimilarity: number;
    clusters: number;
    recommendation: string;
  } {
    if (profiles.length < 2) {
      return {
        avgSimilarity: 0,
        maxSimilarity: 0,
        clusters: profiles.length,
        recommendation: 'Need at least 2 profiles for analysis'
      };
    }

    // Calculate pairwise similarities
    const similarities: number[] = [];

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const sim = this.calculateSimilarity(
          profiles[i].fingerprint,
          profiles[j].fingerprint
        );
        similarities.push(sim);
      }
    }

    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const maxSimilarity = Math.max(...similarities);

    // Estimate clusters (simple threshold-based)
    const threshold = 0.7;
    const clusters = this.estimateClusters(profiles, threshold);

    // Recommendation
    let recommendation = '';
    if (avgSimilarity > 0.5) {
      recommendation = 'HIGH RISK: Profiles are too similar. Increase diversity or minDissimilarity.';
    } else if (avgSimilarity > 0.3) {
      recommendation = 'MEDIUM RISK: Some profiles are similar. Consider increasing minDissimilarity.';
    } else {
      recommendation = 'LOW RISK: Profiles are sufficiently diverse.';
    }

    return {
      avgSimilarity,
      maxSimilarity,
      clusters,
      recommendation
    };
  }

  /**
   * Estimate number of clusters using simple threshold
   */
  private estimateClusters(profiles: Profile[], threshold: number): number {
    const visited = new Set<number>();
    let clusters = 0;

    for (let i = 0; i < profiles.length; i++) {
      if (visited.has(i)) continue;

      // Start new cluster
      clusters++;
      const queue = [i];
      visited.add(i);

      while (queue.length > 0) {
        const current = queue.shift()!;

        // Find similar profiles
        for (let j = 0; j < profiles.length; j++) {
          if (visited.has(j)) continue;

          const similarity = this.calculateSimilarity(
            profiles[current].fingerprint,
            profiles[j].fingerprint
          );

          if (similarity > threshold) {
            visited.add(j);
            queue.push(j);
          }
        }
      }
    }

    return clusters;
  }

  /**
   * Get detailed similarity report
   */
  getSimilarityReport(profile1: Profile, profile2: Profile): {
    overall: number;
    breakdown: { [key: string]: number };
    warnings: string[];
  } {
    const fp1 = profile1.fingerprint;
    const fp2 = profile2.fingerprint;

    const breakdown = {
      screen: this.screenSimilarity(fp1.screen, fp2.screen),
      hardware: this.hardwareSimilarity(fp1.navigator, fp2.navigator),
      webgl: this.webglSimilarity(fp1.webgl, fp2.webgl),
      platform: fp1.navigator.platform === fp2.navigator.platform ? 1 : 0,
      language: this.languageSimilarity(fp1.navigator.languages, fp2.navigator.languages),
      fonts: this.fontSimilarity(fp1.fonts, fp2.fonts),
      canvas: fp1.canvas.hash === fp2.canvas.hash ? 1 : 0
    };

    const overall = this.calculateSimilarity(fp1, fp2);

    const warnings: string[] = [];
    if (breakdown.screen === 1) {
      warnings.push('Identical screen resolution');
    }
    if (breakdown.webgl === 1) {
      warnings.push('Identical GPU/WebGL fingerprint');
    }
    if (breakdown.platform === 1 && breakdown.hardware === 1) {
      warnings.push('Same platform and hardware specs');
    }
    if (breakdown.canvas === 1) {
      warnings.push('Identical canvas fingerprint');
    }
    if (breakdown.fonts > 0.9) {
      warnings.push('Very similar font lists');
    }

    return { overall, breakdown, warnings };
  }

  /**
   * Validate profile diversity (for a set of profiles)
   */
  validateDiversity(profiles: Profile[], minDissimilarity: number = this.minDissimilarity): {
    valid: boolean;
    violations: Array<{
      profile1: string;
      profile2: string;
      similarity: number;
    }>;
  } {
    const violations: Array<{
      profile1: string;
      profile2: string;
      similarity: number;
    }> = [];

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const similarity = this.calculateSimilarity(
          profiles[i].fingerprint,
          profiles[j].fingerprint
        );

        if (similarity > (1 - minDissimilarity)) {
          violations.push({
            profile1: profiles[i].metadata.id,
            profile2: profiles[j].metadata.id,
            similarity
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}

// Example usage:
/*
const generator = new ProfileGenerator();
const antiCorrelation = new AntiCorrelation(generator, 0.7);

// Generate uncorrelated profiles
const profiles: Profile[] = [];
for (let i = 0; i < 10; i++) {
  const profile = await antiCorrelation.generateUncorrelated(profiles);
  profiles.push(profile);
}

// Analyze cluster
const analysis = antiCorrelation.analyzeCluster(profiles);
console.log('Average similarity:', analysis.avgSimilarity);
console.log('Clusters:', analysis.clusters);
console.log('Recommendation:', analysis.recommendation);

// Get similarity report for two profiles
const report = antiCorrelation.getSimilarityReport(profiles[0], profiles[1]);
console.log('Similarity:', report.overall);
console.log('Breakdown:', report.breakdown);
console.log('Warnings:', report.warnings);

// Validate diversity
const validation = antiCorrelation.validateDiversity(profiles, 0.7);
console.log('Valid:', validation.valid);
console.log('Violations:', validation.violations.length);
*/
