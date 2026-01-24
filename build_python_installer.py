#!/usr/bin/env python3
"""
Скрипт для сборки Python установщика в standalone exe
Использует PyInstaller для создания одного exe файла
"""

import os
import subprocess
import sys
import shutil
from pathlib import Path

def check_pyinstaller():
    """Проверка наличия PyInstaller"""
    try:
        import PyInstaller
        print("✓ PyInstaller найден")
        return True
    except ImportError:
        print("✗ PyInstaller не найден")
        print("Установка PyInstaller...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
            print("✓ PyInstaller установлен")
            return True
        except:
            print("✗ Ошибка установки PyInstaller")
            return False

def build_installer():
    """Сборка установщика"""
    print("\n" + "="*70)
    print("  UndetectBrowser - Сборка Python установщика в EXE")
    print("="*70 + "\n")

    # Проверяем PyInstaller
    if not check_pyinstaller():
        print("\nУстановите PyInstaller вручную:")
        print("  pip install pyinstaller")
        return False

    # Создаем директорию для сборки
    dist_dir = Path("dist_installer")
    if dist_dir.exists():
        print("Очистка старой сборки...")
        shutil.rmtree(dist_dir)

    dist_dir.mkdir(exist_ok=True)

    print("\nСборка установщика...")
    print("Это может занять 1-2 минуты...\n")

    # PyInstaller команда
    cmd = [
        "pyinstaller",
        "--onefile",                          # Один exe файл
        "--windowed",                         # Без консоли
        "--name=UndetectBrowser-Installer",  # Имя exe
        "--icon=NONE",                        # Без иконки (можно добавить позже)
        "--distpath=dist_installer",          # Путь для результата
        "--workpath=build_temp",              # Временные файлы
        "--specpath=build_temp",              # Spec файл
        "--clean",                            # Очистка перед сборкой
        "installer_gui.py"                    # Исходный файл
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✓ Сборка завершена успешно!")

        # Проверяем результат
        exe_path = dist_dir / "UndetectBrowser-Installer.exe"
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"\n{'='*70}")
            print(f"  ✓ УСТАНОВЩИК ГОТОВ!")
            print(f"{'='*70}")
            print(f"\nФайл:  {exe_path}")
            print(f"Размер: {size_mb:.2f} MB")
            print(f"\nЭтот exe файл можно распространять!")
            print(f"Пользователи просто запускают его для установки.\n")
            return True
        else:
            print("✗ exe файл не найден после сборки")
            return False

    except subprocess.CalledProcessError as e:
        print(f"✗ Ошибка сборки: {e}")
        if e.stderr:
            print(f"Детали:\n{e.stderr}")
        return False
    finally:
        # Очищаем временные файлы
        if Path("build_temp").exists():
            shutil.rmtree("build_temp")

def create_readme():
    """Создание README для установщика"""
    readme_content = """
# UndetectBrowser Installer

## Установка

1. Запустите UndetectBrowser-Installer.exe
2. Следуйте инструкциям установщика
3. Дождитесь завершения (3-5 минут)
4. Готово!

## Требования

- Windows 10/11 (64-bit)
- Node.js 20+ (установщик предложит скачать)
- 4 GB RAM
- 2 GB свободного места

## Запуск

После установки:
- Ярлык на рабочем столе: UndetectBrowser
- Или: START_ONE_CLICK.vbs в папке установки

## Поддержка

https://github.com/wpeva/new-undetect-browser
"""

    with open("dist_installer/README.txt", "w", encoding="utf-8") as f:
        f.write(readme_content)

    print("✓ README.txt создан")

if __name__ == "__main__":
    success = build_installer()

    if success:
        create_readme()
        print("\n" + "="*70)
        print("  Установщик готов к распространению!")
        print("  Файлы находятся в папке: dist_installer/")
        print("="*70 + "\n")
    else:
        print("\n✗ Сборка не удалась")
        sys.exit(1)
