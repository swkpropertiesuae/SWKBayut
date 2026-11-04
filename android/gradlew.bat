@rem Gradle startup script for Windows — SWKBayut Android (Gradle 8.9)
@if "%DEBUG%"=="" @echo off
where gradle >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  gradle %*
  exit /b %ERRORLEVEL%
)
set DIRNAME=%~dp0
java -classpath "%DIRNAME%\gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
