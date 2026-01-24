; Inno Setup Script для UndetectBrowser
; Создает полноценный exe-инсталлер для Windows
;
; ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ:
; 1. Установите Inno Setup: https://jrsoftware.org/isdl.php
; 2. Откройте этот файл в Inno Setup Compiler
; 3. Нажмите Build -> Compile
; 4. Готовый инсталлер будет в папке Output\

#define MyAppName "UndetectBrowser"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "UndetectBrowser Team"
#define MyAppURL "https://github.com/wpeva/new-undetect-browser"
#define MyAppExeName "START_ONE_CLICK.vbs"

[Setup]
; Основные настройки
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=LICENSE
OutputDir=Output
OutputBaseFilename=UndetectBrowser-Setup-{#MyAppVersion}
SetupIconFile=build\icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; Минимальная версия Windows
MinVersion=10.0

; Языки
[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

; Задачи установки
[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

; Файлы для установки
[Files]
; Основные файлы проекта
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "package-lock.json"; DestDir: "{app}"; Flags: ignoreversion; Attribs: hidden
Source: "tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".env.example"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme

; Скрипты запуска и установки
Source: "INSTALL_ONE_CLICK.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "START_ONE_CLICK.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "START_SIMPLE.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "START_SERVER.bat"; DestDir: "{app}"; Flags: ignoreversion; Attribs: hidden

; Исходный код
Source: "src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "server\*"; DestDir: "{app}\server"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "electron\*"; DestDir: "{app}\electron"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "frontend\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

; Дополнительные компоненты
Source: "cloud\*"; DestDir: "{app}\cloud"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "ml-profiles\*"; DestDir: "{app}\ml-profiles"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "tests\*"; DestDir: "{app}\tests"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "examples\*"; DestDir: "{app}\examples"; Flags: ignoreversion recursesubdirs createallsubdirs

; Конфигурационные файлы
Source: "jest.config.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "eslint.config.js"; DestDir: "{app}"; Flags: ignoreversion
Source: ".prettierrc"; DestDir: "{app}"; Flags: ignoreversion

; Иконки (если есть)
Source: "build\*"; DestDir: "{app}\build"; Flags: ignoreversion recursesubdirs createallsubdirs; Tasks: desktopicon

[Icons]
; Ярлыки в меню Пуск
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; WorkingDir: "{app}"; IconFilename: "{app}\build\icon.ico"
Name: "{group}\Документация"; Filename: "{app}\README.md"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; Ярлык на рабочем столе
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; WorkingDir: "{app}"; IconFilename: "{app}\build\icon.ico"; Tasks: desktopicon

; Ярлык быстрого запуска
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; WorkingDir: "{app}"; IconFilename: "{app}\build\icon.ico"; Tasks: quicklaunchicon

[Run]
; Проверка Node.js перед установкой зависимостей
Filename: "cmd.exe"; Parameters: "/c node --version"; WorkingDir: "{app}"; Flags: runhidden waituntilterminated; StatusMsg: "Проверка Node.js..."; \
  AfterInstall: CheckNodeJS

; Запуск установки зависимостей
Filename: "{app}\INSTALL_ONE_CLICK.bat"; WorkingDir: "{app}"; Flags: runascurrentuser waituntilterminated; StatusMsg: "Установка зависимостей..."; \
  Description: "Установить зависимости сейчас (рекомендуется)"; Check: NodeJSInstalled

; Запуск приложения после установки
Filename: "wscript.exe"; Parameters: """{app}\{#MyAppExeName}""""; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent runascurrentuser; \
  Description: "Запустить {#MyAppName}"; Check: DependenciesInstalled

[UninstallDelete]
; Удаление созданных во время работы файлов
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\frontend\node_modules"
Type: filesandordirs; Name: "{app}\dist"
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\logs"
Type: files; Name: "{app}\.env"
Type: files; Name: "{app}\package-lock.json"

[Code]
var
  NodeJSInstalled: Boolean;
  DependenciesInstalled: Boolean;

// Проверка наличия Node.js
function CheckNodeJS(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  NodeJSInstalled := False;

  // Проверяем наличие node
  if Exec('cmd.exe', '/c node --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
    begin
      NodeJSInstalled := True;
      Log('Node.js найден');
    end
    else
    begin
      Log('Node.js не найден');
      MsgBox('Node.js не установлен!' + #13#10 + #13#10 +
             'Для работы приложения требуется Node.js 20 или выше.' + #13#10 +
             'Скачайте с https://nodejs.org/' + #13#10 + #13#10 +
             'После установки Node.js запустите INSTALL_ONE_CLICK.bat из папки программы.',
             mbError, MB_OK);
    end;
  end;
end;

// Проверка успешности установки зависимостей
function DependenciesInstalled(): Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\node_modules\puppeteer\package.json')) and
            FileExists(ExpandConstant('{app}\dist\server\index-v2.js'));
  DependenciesInstalled := Result;

  if not Result then
  begin
    Log('Зависимости не установлены полностью');
  end;
end;

// Инициализация мастера
function InitializeSetup(): Boolean;
begin
  Result := True;
  NodeJSInstalled := False;
  DependenciesInstalled := False;
end;

// Сообщение после завершения установки
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if not NodeJSInstalled then
    begin
      MsgBox('Установка завершена!' + #13#10 + #13#10 +
             'ВАЖНО: Установите Node.js 20+ с https://nodejs.org/' + #13#10 +
             'Затем запустите INSTALL_ONE_CLICK.bat из папки программы.',
             mbInformation, MB_OK);
    end;
  end;
end;
