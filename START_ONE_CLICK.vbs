' UndetectBrowser - One Click Starter (без окна консоли)
' Запускает приложение без отображения командной строки

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Получаем путь к текущей папке
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Проверяем наличие START_SIMPLE.bat
strBatchFile = strScriptPath & "\START_SIMPLE.bat"

If Not objFSO.FileExists(strBatchFile) Then
    MsgBox "Ошибка: START_SIMPLE.bat не найден!" & vbCrLf & vbCrLf & _
           "Путь: " & strBatchFile, vbCritical, "UndetectBrowser"
    WScript.Quit 1
End If

' Показываем сообщение о запуске
MsgBox "UndetectBrowser запускается..." & vbCrLf & vbCrLf & _
       "Приложение откроется через несколько секунд." & vbCrLf & _
       "После выбора режима работы это окно закроется.", _
       vbInformation, "UndetectBrowser"

' Запускаем BAT файл скрыто (0 = скрытое окно, True = ждать завершения = False)
' 0 = скрытое окно, 1 = нормальное окно, 2 = минимизированное
objShell.Run """" & strBatchFile & """", 1, False

' Очищаем объекты
Set objShell = Nothing
Set objFSO = Nothing

WScript.Quit 0
