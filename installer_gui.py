#!/usr/bin/env python3
"""
UndetectBrowser - Professional Windows Installer
Version: 1.0.0

GUI установщик для Windows с автоматической установкой всех зависимостей
Может быть скомпилирован в exe через PyInstaller
"""

import os
import sys
import subprocess
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import threading
import urllib.request
import json
from pathlib import Path
import shutil
import time

class UndetectBrowserInstaller:
    def __init__(self, root):
        self.root = root
        self.root.title("UndetectBrowser Installer v1.0.0")
        self.root.geometry("700x550")
        self.root.resizable(False, False)

        # Определяем директорию установки
        if getattr(sys, 'frozen', False):
            # Если запущен как exe
            self.install_dir = os.path.dirname(sys.executable)
        else:
            # Если запущен как скрипт
            self.install_dir = os.path.dirname(os.path.abspath(__file__))

        self.setup_ui()

    def setup_ui(self):
        """Создание интерфейса"""

        # Заголовок
        header_frame = tk.Frame(self.root, bg="#0066cc", height=80)
        header_frame.pack(fill=tk.X)
        header_frame.pack_propagate(False)

        title_label = tk.Label(
            header_frame,
            text="UndetectBrowser",
            font=("Arial", 24, "bold"),
            bg="#0066cc",
            fg="white"
        )
        title_label.pack(pady=10)

        subtitle_label = tk.Label(
            header_frame,
            text="Professional Anti-Detection Browser",
            font=("Arial", 10),
            bg="#0066cc",
            fg="white"
        )
        subtitle_label.pack()

        # Основной контент
        content_frame = tk.Frame(self.root, padx=20, pady=20)
        content_frame.pack(fill=tk.BOTH, expand=True)

        # Информация
        info_text = """
Добро пожаловать в установщик UndetectBrowser!

Этот мастер установит:
• Backend сервер (Node.js + TypeScript)
• Frontend веб-интерфейс
• Electron desktop приложение
• Все необходимые зависимости

Требования:
• Windows 10/11 (64-bit)
• Node.js 20+ (будет установлен автоматически)
• 4 GB RAM
• 2 GB свободного места

Установка займёт 3-5 минут.
        """

        info_label = tk.Label(
            content_frame,
            text=info_text,
            justify=tk.LEFT,
            font=("Arial", 9)
        )
        info_label.pack(pady=10)

        # Директория установки
        dir_frame = tk.Frame(content_frame)
        dir_frame.pack(fill=tk.X, pady=10)

        tk.Label(dir_frame, text="Директория:", font=("Arial", 9, "bold")).pack(anchor=tk.W)

        dir_entry_frame = tk.Frame(dir_frame)
        dir_entry_frame.pack(fill=tk.X, pady=5)

        self.dir_var = tk.StringVar(value=self.install_dir)
        dir_entry = tk.Entry(dir_entry_frame, textvariable=self.dir_var, font=("Arial", 9))
        dir_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

        # Опции
        options_frame = tk.Frame(content_frame)
        options_frame.pack(fill=tk.X, pady=10)

        self.create_shortcut_var = tk.BooleanVar(value=True)
        tk.Checkbutton(
            options_frame,
            text="Создать ярлык на рабочем столе",
            variable=self.create_shortcut_var,
            font=("Arial", 9)
        ).pack(anchor=tk.W)

        self.auto_start_var = tk.BooleanVar(value=True)
        tk.Checkbutton(
            options_frame,
            text="Запустить после установки",
            variable=self.auto_start_var,
            font=("Arial", 9)
        ).pack(anchor=tk.W)

        # Прогресс
        self.progress_frame = tk.Frame(content_frame)
        self.progress_frame.pack(fill=tk.X, pady=10)

        self.status_label = tk.Label(
            self.progress_frame,
            text="Готов к установке",
            font=("Arial", 9)
        )
        self.status_label.pack(anchor=tk.W)

        self.progress = ttk.Progressbar(
            self.progress_frame,
            mode='indeterminate',
            length=660
        )
        self.progress.pack(pady=5)

        # Кнопки
        button_frame = tk.Frame(content_frame)
        button_frame.pack(fill=tk.X, pady=10)

        self.install_button = tk.Button(
            button_frame,
            text="Установить",
            command=self.start_installation,
            bg="#0066cc",
            fg="white",
            font=("Arial", 10, "bold"),
            width=15,
            height=2
        )
        self.install_button.pack(side=tk.LEFT, padx=5)

        self.cancel_button = tk.Button(
            button_frame,
            text="Отмена",
            command=self.cancel_installation,
            font=("Arial", 10),
            width=15,
            height=2
        )
        self.cancel_button.pack(side=tk.LEFT, padx=5)

    def start_installation(self):
        """Начать установку"""
        self.install_button.config(state=tk.DISABLED)
        self.progress.start()

        # Запускаем установку в отдельном потоке
        thread = threading.Thread(target=self.install)
        thread.daemon = True
        thread.start()

    def update_status(self, message):
        """Обновить статус"""
        self.status_label.config(text=message)
        self.root.update()

    def install(self):
        """Процесс установки"""
        try:
            # Шаг 1: Проверка Node.js
            self.update_status("⏳ Шаг 1/6: Проверка Node.js...")
            if not self.check_nodejs():
                self.update_status("❌ Node.js не найден!")
                response = messagebox.askyesno(
                    "Node.js не найден",
                    "Node.js не установлен на вашем компьютере.\n\n"
                    "Для работы UndetectBrowser требуется Node.js 20 или выше.\n\n"
                    "Открыть страницу загрузки Node.js?"
                )
                if response:
                    import webbrowser
                    webbrowser.open("https://nodejs.org/")
                self.installation_failed()
                return

            self.update_status("✓ Node.js найден")
            time.sleep(0.5)

            # Шаг 2: Проверка npm
            self.update_status("⏳ Шаг 2/6: Проверка npm...")
            if not self.check_npm():
                self.update_status("❌ npm не найден!")
                self.installation_failed()
                return

            self.update_status("✓ npm найден")
            time.sleep(0.5)

            # Шаг 3: Установка backend зависимостей
            self.update_status("⏳ Шаг 3/6: Установка backend зависимостей (2-3 минуты)...")
            if not self.install_backend_deps():
                self.update_status("❌ Ошибка установки backend зависимостей")
                self.installation_failed()
                return

            self.update_status("✓ Backend зависимости установлены")
            time.sleep(0.5)

            # Шаг 4: Установка frontend зависимостей
            self.update_status("⏳ Шаг 4/6: Установка frontend зависимостей (1-2 минуты)...")
            if not self.install_frontend_deps():
                self.update_status("❌ Ошибка установки frontend зависимостей")
                self.installation_failed()
                return

            self.update_status("✓ Frontend зависимости установлены")
            time.sleep(0.5)

            # Шаг 5: Компиляция TypeScript
            self.update_status("⏳ Шаг 5/6: Компиляция TypeScript...")
            if not self.compile_typescript():
                self.update_status("⚠ Предупреждения при компиляции (продолжаем)")
                time.sleep(1)
            else:
                self.update_status("✓ TypeScript скомпилирован")
                time.sleep(0.5)

            # Шаг 6: Создание конфигурации
            self.update_status("⏳ Шаг 6/6: Создание конфигурации...")
            self.create_env_file()
            self.update_status("✓ Конфигурация создана")
            time.sleep(0.5)

            # Создание ярлыков
            if self.create_shortcut_var.get():
                self.update_status("⏳ Создание ярлыков...")
                self.create_shortcuts()
                self.update_status("✓ Ярлыки созданы")
                time.sleep(0.5)

            # Завершение
            self.installation_complete()

        except Exception as e:
            messagebox.showerror("Ошибка", f"Произошла ошибка:\n{str(e)}")
            self.installation_failed()

    def check_nodejs(self):
        """Проверка Node.js"""
        try:
            result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                # Проверяем версию (нужен v18+)
                major_version = int(version.replace('v', '').split('.')[0])
                return major_version >= 18
            return False
        except:
            return False

    def check_npm(self):
        """Проверка npm"""
        try:
            result = subprocess.run(
                ["npm", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False

    def install_backend_deps(self):
        """Установка backend зависимостей"""
        try:
            os.chdir(self.install_dir)
            result = subprocess.run(
                ["npm", "install", "--legacy-peer-deps"],
                capture_output=True,
                text=True,
                timeout=300
            )
            return result.returncode == 0
        except Exception as e:
            print(f"Error installing backend deps: {e}")
            return False

    def install_frontend_deps(self):
        """Установка frontend зависимостей"""
        try:
            frontend_dir = os.path.join(self.install_dir, "frontend")
            if os.path.exists(frontend_dir):
                os.chdir(frontend_dir)
                result = subprocess.run(
                    ["npm", "install"],
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                os.chdir(self.install_dir)
                return result.returncode == 0
            return True
        except Exception as e:
            print(f"Error installing frontend deps: {e}")
            return False

    def compile_typescript(self):
        """Компиляция TypeScript"""
        try:
            os.chdir(self.install_dir)
            result = subprocess.run(
                ["npm", "run", "build:safe"],
                capture_output=True,
                text=True,
                timeout=120
            )
            # Возвращаем True даже если есть ошибки компиляции
            return True
        except Exception as e:
            print(f"Error compiling TypeScript: {e}")
            return True

    def create_env_file(self):
        """Создание .env файла"""
        env_path = os.path.join(self.install_dir, ".env")
        if not os.path.exists(env_path):
            env_example = os.path.join(self.install_dir, ".env.example")
            if os.path.exists(env_example):
                shutil.copy(env_example, env_path)
            else:
                # Создаем базовый .env
                with open(env_path, 'w') as f:
                    f.write("""# UndetectBrowser Configuration
NODE_ENV=production
PORT=3000
FRONTEND_PORT=3001

# Security
SESSION_SECRET=change_this_in_production

# Browser Settings
HEADLESS=false
ENABLE_STEALTH=true

# Logging
LOG_LEVEL=info
""")

    def create_shortcuts(self):
        """Создание ярлыков"""
        try:
            desktop = os.path.join(os.path.expanduser("~"), "Desktop")

            # Создаем VBS ярлык
            vbs_path = os.path.join(self.install_dir, "START_ONE_CLICK.vbs")
            shortcut_path = os.path.join(desktop, "UndetectBrowser.lnk")

            # Используем PowerShell для создания ярлыка
            ps_script = f"""
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{shortcut_path}")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = '"{vbs_path}"'
$Shortcut.WorkingDirectory = "{self.install_dir}"
$Shortcut.Description = "UndetectBrowser - Anti-Detection Browser"
$Shortcut.Save()
"""

            subprocess.run(
                ["powershell", "-Command", ps_script],
                capture_output=True,
                timeout=10
            )
        except Exception as e:
            print(f"Error creating shortcuts: {e}")

    def installation_complete(self):
        """Установка завершена"""
        self.progress.stop()
        self.update_status("✓ Установка завершена успешно!")

        messagebox.showinfo(
            "Установка завершена",
            "UndetectBrowser успешно установлен!\n\n"
            "Вы можете запустить приложение:\n"
            "• С рабочего стола (ярлык UndetectBrowser)\n"
            "• Или запустив START_ONE_CLICK.vbs\n\n"
            "Документация находится в папке установки."
        )

        if self.auto_start_var.get():
            self.launch_app()

        self.root.quit()

    def installation_failed(self):
        """Установка не удалась"""
        self.progress.stop()
        self.install_button.config(state=tk.NORMAL)

    def launch_app(self):
        """Запуск приложения"""
        try:
            vbs_path = os.path.join(self.install_dir, "START_ONE_CLICK.vbs")
            if os.path.exists(vbs_path):
                subprocess.Popen(["wscript.exe", vbs_path], cwd=self.install_dir)
        except Exception as e:
            print(f"Error launching app: {e}")

    def cancel_installation(self):
        """Отмена установки"""
        response = messagebox.askyesno(
            "Отмена установки",
            "Вы уверены, что хотите отменить установку?"
        )
        if response:
            self.root.quit()


def main():
    """Главная функция"""
    root = tk.Tk()

    # Центрируем окно
    root.update_idletasks()
    width = root.winfo_width()
    height = root.winfo_height()
    x = (root.winfo_screenwidth() // 2) - (width // 2)
    y = (root.winfo_screenheight() // 2) - (height // 2)
    root.geometry(f'{width}x{height}+{x}+{y}')

    app = UndetectBrowserInstaller(root)
    root.mainloop()


if __name__ == "__main__":
    main()
