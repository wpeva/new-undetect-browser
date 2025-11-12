# QEMU/KVM Virtualization Module

**Сессия 6: Настройка QEMU/KVM**
**Уровень 3: Аппаратная виртуализация**

Полнофункциональная система управления виртуальными машинами QEMU/KVM для проекта Undetect Browser.

## 📋 Содержание

- [Обзор](#обзор)
- [Требования](#требования)
- [Установка](#установка)
- [Структура проекта](#структура-проекта)
- [Быстрый старт](#быстрый-старт)
- [Документация](#документация)
- [Примеры использования](#примеры-использования)

## 🎯 Обзор

Модуль виртуализации предоставляет:

- **QEMU Manager** - управление жизненным циклом виртуальных машин
- **Image Manager** - управление образами ВМ и снапшотами
- **GPU Passthrough** - проброс видеокарты или софтовый рендеринг (SwiftShader)
- **Network Isolation** - сетевая изоляция через macvlan/bridge
- **Hardware Profiles** - предустановленные профили оборудования
- **Automation Scripts** - скрипты для автоматизации создания ВМ

## 📦 Требования

### Обязательные зависимости

```bash
# QEMU/KVM
sudo apt-get install qemu-kvm qemu-utils

# Виртуализация
sudo apt-get install libvirt-daemon-system libvirt-clients bridge-utils

# Дополнительные инструменты
sudo apt-get install virt-manager ovmf swtpm
```

### Проверка поддержки KVM

```bash
# Проверить, поддерживает ли CPU виртуализацию
egrep -c '(vmx|svm)' /proc/cpuinfo
# Если > 0, то поддерживает

# Проверить доступность /dev/kvm
ls -l /dev/kvm

# Добавить пользователя в группу kvm
sudo usermod -aG kvm $USER
sudo usermod -aG libvirt $USER
```

### Опциональные зависимости

```bash
# Для GPU passthrough
sudo apt-get install pci-stub vfio-pci

# Для сетевой изоляции
sudo apt-get install iptables iproute2

# Для SwiftShader (программный рендеринг)
# Скачать с https://github.com/google/swiftshader
```

## 🚀 Установка

### 1. Включение IOMMU (для GPU passthrough)

Для Intel:
```bash
# /etc/default/grub
GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"
```

Для AMD:
```bash
# /etc/default/grub
GRUB_CMDLINE_LINUX_DEFAULT="quiet amd_iommu=on iommu=pt"
```

Обновить GRUB:
```bash
sudo update-grub
sudo reboot
```

### 2. Настройка VFIO (для GPU passthrough)

```bash
# Найти ID вашей видеокарты
lspci -nn | grep VGA

# Пример вывода:
# 01:00.0 VGA compatible controller [0300]: NVIDIA Corporation ... [10de:2684]

# Добавить в /etc/modprobe.d/vfio.conf
options vfio-pci ids=10de:2684

# Обновить initramfs
sudo update-initramfs -u
sudo reboot
```

### 3. Настройка сетевого моста

```bash
# Создать bridge для ВМ
sudo ip link add name virbr0 type bridge
sudo ip addr add 192.168.122.1/24 dev virbr0
sudo ip link set virbr0 up

# Включить IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
```

## 📂 Структура проекта

```
cloud/vm/
├── types.ts                      # TypeScript типы и интерфейсы
├── qemu-manager.ts              # Основной менеджер QEMU
│
├── images/
│   ├── image-manager.ts         # Менеджер образов ВМ
│   └── templates.json           # Шаблоны образов
│
├── profiles/
│   └── hardware-profiles.ts     # Профили оборудования
│
├── gpu/
│   └── gpu-passthrough.ts       # GPU passthrough и SwiftShader
│
├── network/
│   └── network-isolation.ts     # Сетевая изоляция (macvlan)
│
├── scripts/
│   ├── create-windows11-image.sh
│   ├── create-ubuntu-image.sh
│   └── manage-images.sh         # Управление образами
│
└── README.md                     # Этот файл
```

## 🏃 Быстрый старт

### Использование TypeScript API

```typescript
import { QEMUManager } from './cloud/vm/qemu-manager';
import { ImageManager } from './cloud/vm/images/image-manager';
import { standardIntelDesktop } from './cloud/vm/profiles/hardware-profiles';

// Инициализация
const qemuManager = new QEMUManager();
const imageManager = new ImageManager();

await qemuManager.initialize();
await imageManager.initialize();

// Получить шаблон образа
const template = imageManager.getTemplate('img-windows11-standard');

// Создать ВМ
const vm = await qemuManager.createVM({
  name: 'test-vm',
  hardwareProfile: standardIntelDesktop,
  imageTemplate: template!,
  autoStart: true
});

console.log(`VM created: ${vm.id}`);
console.log(`VNC port: ${vm.vncPort}`);

// Остановить ВМ
await qemuManager.stopVM(vm.id);

// Удалить ВМ
await qemuManager.deleteVM(vm.id);
```

### Использование скриптов

#### Создание образа Windows 11

```bash
# Создать образ Windows 11
cd cloud/vm/scripts
./create-windows11-image.sh /path/to/Win11.iso 5901

# Подключиться через VNC
vncviewer localhost:5901

# После установки создать снапшот
./manage-images.sh snapshot windows11-23h2.qcow2 clean_install
```

#### Создание образа Ubuntu

```bash
# Создать образ Ubuntu 22.04
./create-ubuntu-image.sh 22.04 /path/to/ubuntu-22.04.iso 5902

# Подключиться через VNC
vncviewer localhost:5902

# После установки создать снапшот
./manage-images.sh snapshot ubuntu-22.04.qcow2 clean_install
```

#### Управление образами

```bash
# Список всех образов
./manage-images.sh list

# Создать снапшот
./manage-images.sh snapshot windows11.qcow2 before_update

# Восстановить снапшот
./manage-images.sh restore windows11.qcow2 clean_install

# Сжать образ
./manage-images.sh compact windows11.qcow2

# Изменить размер образа
./manage-images.sh resize windows11.qcow2 100G

# Клонировать образ (Copy-on-Write)
./manage-images.sh clone windows11.qcow2 windows11-dev.qcow2
```

## 📚 Документация

### QEMU Manager API

#### `createVM(options)`

Создает новую виртуальную машину.

**Параметры:**
```typescript
interface CreateVMOptions {
  name: string;
  hardwareProfile: HardwareProfile;
  imageTemplate: VMImageTemplate;
  autoStart?: boolean;
  cloneImage?: boolean;
}
```

**Возвращает:** `Promise<VMInstance>`

**Пример:**
```typescript
const vm = await qemuManager.createVM({
  name: 'my-vm',
  hardwareProfile: standardIntelDesktop,
  imageTemplate: windowsTemplate,
  autoStart: true
});
```

#### `stopVM(vmId, options?)`

Останавливает виртуальную машину.

**Параметры:**
- `vmId: string` - ID виртуальной машины
- `options?: VMControlOptions` - Опции остановки

**Пример:**
```typescript
// Graceful shutdown
await qemuManager.stopVM(vmId);

// Force shutdown
await qemuManager.stopVM(vmId, { force: true });
```

#### `pauseVM(vmId)` / `resumeVM(vmId)`

Приостановить/возобновить работу ВМ.

**Пример:**
```typescript
await qemuManager.pauseVM(vmId);
// ... do something ...
await qemuManager.resumeVM(vmId);
```

#### `getVM(vmId)` / `listVMs()`

Получить информацию о ВМ.

**Пример:**
```typescript
const vm = qemuManager.getVM(vmId);
console.log(vm.status); // 'running' | 'paused' | 'stopped'

const allVMs = qemuManager.listVMs();
console.log(`Total VMs: ${allVMs.length}`);
```

### Hardware Profiles

Предустановленные профили оборудования:

1. **standardIntelDesktop** - Intel i7-12700K + NVIDIA RTX 3060
2. **highPerformanceIntel** - Intel i9-13900K + GPU Passthrough
3. **standardAMDDesktop** - AMD Ryzen 9 5950X + Radeon RX 6800
4. **highPerformanceAMD** - AMD Ryzen 7 7700X + GPU Passthrough
5. **budgetSwiftShader** - Бюджетный профиль с программным рендерингом
6. **macOSProfile** - Для установки macOS (Hackintosh)
7. **linuxDevelopment** - Оптимизирован для разработки на Linux

**Пример использования:**
```typescript
import {
  standardIntelDesktop,
  highPerformanceAMD,
  budgetSwiftShader
} from './cloud/vm/profiles/hardware-profiles';

// Использовать готовый профиль
const vm = await qemuManager.createVM({
  name: 'gaming-vm',
  hardwareProfile: highPerformanceAMD,
  imageTemplate: windowsTemplate
});

// Клонировать и модифицировать профиль
import { cloneProfile } from './cloud/vm/profiles/hardware-profiles';

const customProfile = cloneProfile(standardIntelDesktop, {
  ramGB: 32,
  cpu: {
    ...standardIntelDesktop.cpu,
    cores: 16
  }
});
```

### GPU Passthrough

#### Настройка GPU Passthrough

```typescript
import { GPUPassthroughManager } from './cloud/vm/gpu/gpu-passthrough';

const gpuManager = new GPUPassthroughManager();

// Проверить поддержку VFIO
const support = await gpuManager.checkVFIOSupport();
console.log('VFIO available:', support.available);
console.log('IOMMU enabled:', support.iommuEnabled);

// Список GPU
const devices = await gpuManager.listPCIDevices();
devices.forEach(dev => {
  console.log(`${dev.slot}: ${dev.vendor}:${dev.device} (driver: ${dev.driver})`);
});

// Привязать GPU к VFIO
await gpuManager.bindToVFIO('0000:01:00.0');

// Сгенерировать скрипт настройки
await gpuManager.generatePassthroughScript(
  '0000:01:00.0',
  '/tmp/setup-gpu-passthrough.sh'
);
```

#### SwiftShader (программный рендеринг)

```typescript
import { SwiftShaderManager } from './cloud/vm/gpu/gpu-passthrough';

const swiftshader = new SwiftShaderManager('/usr/lib/swiftshader');

// Проверить установку
const installation = await swiftshader.checkInstallation();
console.log('SwiftShader installed:', installation.installed);

// Настроить для ВМ
const config = await swiftshader.configureSwiftShader({
  enabled: true,
  libraryPath: '/usr/lib/swiftshader',
  threadCount: 4
});

// Добавить переменные окружения к QEMU
// config.envVars содержит необходимые ENV vars
```

### Network Isolation

#### Настройка сетевой изоляции

```typescript
import { NetworkIsolationManager } from './cloud/vm/network/network-isolation';

const netManager = new NetworkIsolationManager();

// Проверить возможности
const caps = await netManager.checkCapabilities();
console.log('macvlan support:', caps.macvlanSupport);
console.log('bridge support:', caps.bridgeSupport);

// Создать macvlan интерфейс
await netManager.createMacvlan({
  name: 'macvlan-vm1',
  parent: 'eth0',
  mode: 'bridge',
  macAddress: '52:54:00:12:34:56'
});

// Настроить firewall
await netManager.configureFirewall({
  interface: 'macvlan-vm1',
  allowedPorts: [80, 443, 8080],
  blockedIPs: ['10.0.0.100'],
  rateLimiting: true
});

// Настроить DNS изоляцию
await netManager.configureDNS({
  interface: 'macvlan-vm1',
  customDNS: ['8.8.8.8', '1.1.1.1'],
  blockDNSLeaks: true
});

// Полная настройка изоляции для ВМ
const isolation = await netManager.setupIsolation('vm-id-123', {
  enabled: true,
  mode: 'macvlan',
  parentInterface: 'eth0',
  macvlanMode: 'bridge',
  firewall: {
    enabled: true,
    allowedPorts: [80, 443],
    rateLimiting: true
  },
  blockDNSLeaks: true,
  customDNS: ['8.8.8.8']
});

console.log('TAP device:', isolation.tapDevice);
console.log('Network interface:', isolation.interface);
```

## 🔧 Примеры использования

### Пример 1: Создание простой ВМ

```typescript
import { QEMUManager } from './cloud/vm/qemu-manager';
import { ImageManager } from './cloud/vm/images/image-manager';
import { standardIntelDesktop } from './cloud/vm/profiles/hardware-profiles';

async function createSimpleVM() {
  const qemu = new QEMUManager();
  const images = new ImageManager();

  await qemu.initialize();
  await images.initialize();

  // Получить шаблон Windows 11
  const template = images.getTemplate('img-windows11-standard');

  if (!template) {
    throw new Error('Windows 11 template not found');
  }

  // Создать ВМ
  const vm = await qemu.createVM({
    name: 'windows11-test',
    hardwareProfile: standardIntelDesktop,
    imageTemplate: template,
    autoStart: true
  });

  console.log(`VM created successfully!`);
  console.log(`ID: ${vm.id}`);
  console.log(`VNC Port: ${vm.vncPort}`);
  console.log(`Connect: vncviewer localhost:${vm.vncPort}`);

  return vm;
}

createSimpleVM().catch(console.error);
```

### Пример 2: ВМ с GPU Passthrough

```typescript
import { QEMUManager } from './cloud/vm/qemu-manager';
import { GPUPassthroughManager } from './cloud/vm/gpu/gpu-passthrough';
import { cloneProfile } from './cloud/vm/profiles/hardware-profiles';
import { highPerformanceIntel } from './cloud/vm/profiles/hardware-profiles';

async function createGamingVM() {
  const qemu = new QEMUManager();
  const gpu = new GPUPassthroughManager();

  // Проверить поддержку GPU passthrough
  const support = await gpu.checkVFIOSupport();
  if (!support.available) {
    throw new Error('GPU passthrough not available');
  }

  // Найти GPU
  const devices = await gpu.listPCIDevices();
  const myGPU = devices.find(d => d.vendor === '10de'); // NVIDIA

  if (!myGPU) {
    throw new Error('No NVIDIA GPU found');
  }

  // Привязать к VFIO
  if (myGPU.driver !== 'vfio-pci') {
    await gpu.bindToVFIO(myGPU.slot);
  }

  // Создать профиль с GPU passthrough
  const profile = cloneProfile(highPerformanceIntel, {
    gpu: {
      type: 'vfio-pci',
      vendor: 'NVIDIA',
      model: 'RTX 4090',
      vram: 24576,
      pciSlot: myGPU.slot
    }
  });

  // Создать ВМ
  const vm = await qemu.createVM({
    name: 'gaming-vm',
    hardwareProfile: profile,
    imageTemplate: windowsTemplate,
    autoStart: true
  });

  console.log(`Gaming VM created with GPU passthrough!`);
  console.log(`GPU: ${myGPU.slot}`);

  return vm;
}

createGamingVM().catch(console.error);
```

### Пример 3: ВМ с сетевой изоляцией

```typescript
import { QEMUManager } from './cloud/vm/qemu-manager';
import { NetworkIsolationManager } from './cloud/vm/network/network-isolation';
import { standardIntelDesktop } from './cloud/vm/profiles/hardware-profiles';

async function createIsolatedVM() {
  const qemu = new QEMUManager();
  const network = new NetworkIsolationManager();

  const vm = await qemu.createVM({
    name: 'isolated-vm',
    hardwareProfile: standardIntelDesktop,
    imageTemplate: windowsTemplate,
    autoStart: false
  });

  // Настроить изоляцию
  await network.setupIsolation(vm.id, {
    enabled: true,
    mode: 'macvlan',
    parentInterface: 'eth0',
    macvlanMode: 'bridge',
    firewall: {
      enabled: true,
      allowedPorts: [80, 443],
      blockedIPs: ['192.168.1.100'],
      rateLimiting: true
    },
    blockDNSLeaks: true,
    customDNS: ['8.8.8.8', '1.1.1.1']
  });

  // Запустить ВМ
  await qemu.resumeVM(vm.id);

  console.log('Isolated VM created with network security!');

  return vm;
}

createIsolatedVM().catch(console.error);
```

## 🐛 Устранение неполадок

### KVM не доступен

```bash
# Проверить модули
lsmod | grep kvm

# Загрузить модули
sudo modprobe kvm
sudo modprobe kvm_intel  # или kvm_amd
```

### VFIO не работает

```bash
# Проверить IOMMU
dmesg | grep -i iommu

# Проверить VFIO группы
find /sys/kernel/iommu_groups/ -type l
```

### ВМ не запускается

```bash
# Проверить права доступа
ls -l /dev/kvm
ls -l /var/lib/undetect-browser/vm/

# Проверить логи
journalctl -xe | grep qemu
```

## 📊 Системные требования

### Минимальные

- CPU: 4 ядра с поддержкой виртуализации (VT-x/AMD-V)
- RAM: 16 GB
- Диск: 100 GB свободного места
- ОС: Ubuntu 20.04+ или Debian 11+

### Рекомендуемые

- CPU: 8+ ядер с поддержкой виртуализации
- RAM: 32 GB+
- Диск: 500 GB+ SSD
- GPU: Для passthrough требуется 2 GPU (host + guest)

## 🎓 Дополнительные ресурсы

- [QEMU Documentation](https://www.qemu.org/documentation/)
- [KVM on Ubuntu](https://help.ubuntu.com/community/KVM)
- [GPU Passthrough Guide](https://wiki.archlinux.org/title/PCI_passthrough_via_OVMF)
- [VFIO Guide](https://www.kernel.org/doc/html/latest/driver-api/vfio.html)

## ✅ Чеклист Сессии 6

- [x] QEMU Manager реализован
- [x] Image Manager для управления образами ВМ
- [x] Hardware Profiles с различными конфигурациями
- [x] GPU Passthrough (VFIO) поддержка
- [x] SwiftShader для программного рендеринга
- [x] Network Isolation (macvlan) реализована
- [x] Скрипты создания образов Windows/Ubuntu
- [x] Скрипты управления образами
- [x] Полная документация

## 📝 Лицензия

MIT License - см. LICENSE файл проекта

---

**Сессия 6 завершена!** 🎉
Переход к Сессии 7: Интеграция Chromium + QEMU
