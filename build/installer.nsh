; BYOK-Vid-Creator — custom NSIS uninstall step.
; electron-builder injects this into the generated uninstaller via nsis.include.
;
; Uninstalling always removes the app, its shortcuts and its registry entries
; (electron-builder does those). This adds ONE question: whether to also
; delete the saved keys, settings, fonts, downloaded footage and renders.
;
; THE FOLDER NAME MATTERS. electron/main.ts pins the app's name with
; app.setName("byok-vid-creator"), and Electron keeps its data under that name.
; Image Forge once deleted a folder that had never existed and said it had;
; this path is the one the app really writes to — checked 14 Sep 2026 against
; this machine, where renders land in %APPDATA%\byok-vid-creator\renders.
;
; /SD IDNO: a SILENT uninstall (uninstall.exe /S) answers No, so a scripted
; uninstall can never wipe someone's keys and finished videos unseen.

!macro customUnInstall
  SetShellVarContext current
  MessageBox MB_YESNO|MB_ICONQUESTION "Remove your BYOK-Vid-Creator data as well?$\r$\n$\r$\nThis deletes your saved keys, settings, downloaded footage and FINISHED VIDEOS, stored in$\r$\n%APPDATA%\byok-vid-creator$\r$\n$\r$\nAnswer No to keep everything for a future reinstall." /SD IDNO IDNO keepVidData
    RMDir /r "$APPDATA\byok-vid-creator"
  keepVidData:
!macroend
