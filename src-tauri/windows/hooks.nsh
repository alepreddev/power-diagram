; ==============================================================================
; Hooks personalizados para el instalador NSIS de Power Diagram (Tauri v2)
; ==============================================================================
; Proposito:
; 1. Detener procesos activos de 'Power Diagram.exe' para evitar archivos bloqueados.
; 2. Desinstalar silenciosamente versiones anteriores antes de sobreescribir.
; 3. Limpiar registros obsoletos en HKLM y HKCU para evitar entradas duplicadas
;    en 'Aplicaciones instaladas' de Windows.
; ==============================================================================

!include "LogicLib.nsh"

!macro NSIS_HOOK_PREINSTALL
  ; 1. Cerrar procesos de Power Diagram en ejecucion
  nsExec::Exec 'taskkill /F /IM "Power Diagram.exe"'
  Sleep 500

  Push $R0
  Push $R1

  ; 2. Si ya existe un desinstalador en el directorio de destino actual, ejecutarlo silenciosamente
  ${If} ${FileExists} "$INSTDIR\uninstall.exe"
    ExecWait '"$INSTDIR\uninstall.exe" /S _?=$INSTDIR'
    Sleep 1000
  ${EndIf}

  ; 3. Buscar posibles instalaciones previas registradas en HKCU o HKLM
  ClearErrors
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.jose.power-diagram" "UninstallString"
  ${If} $R0 == ""
    ClearErrors
    ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Power Diagram" "UninstallString"
  ${EndIf}
  ${If} $R0 == ""
    ClearErrors
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.jose.power-diagram" "UninstallString"
  ${EndIf}
  ${If} $R0 == ""
    ClearErrors
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Power Diagram" "UninstallString"
  ${EndIf}

  ${If} $R0 != ""
    ; Limpiar comillas iniciales y finales si la cadena de registro las contiene
    StrCpy $R1 $R0 1
    ${If} $R1 == `"`
      StrCpy $R0 $R0 `` 1
    ${EndIf}
    StrCpy $R1 $R0 1 -1
    ${If} $R1 == `"`
      StrCpy $R0 $R0 -1
    ${EndIf}

    ; Si el desinstalador encontrado no es el de $INSTDIR (que ya ejecutamos), lanzarlo silenciosamente
    ${If} ${FileExists} "$R0"
      ${If} "$R0" != "$INSTDIR\uninstall.exe"
        ExecWait '"$R0" /S'
        Sleep 1000
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ; 4. Limpiar claves de desinstalacion obsoletas en HKLM (por si una version previa se instalo como admin o 'por maquina')
  ; para garantizar que solo exista una unica entrada limpia en HKCU.
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.jose.power-diagram"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Power Diagram"
  DeleteRegKey HKLM "Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\com.jose.power-diagram"
  DeleteRegKey HKLM "Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Power Diagram"

  Pop $R1
  Pop $R0
!macroend
