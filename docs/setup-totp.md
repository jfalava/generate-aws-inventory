# Configurar TOTP (`--setup-totp`)

## Descripción

Configura el secreto TOTP (Time-based One-Time Password) necesario para la autenticación MFA con `letme`. Este secreto se almacena de forma segura en el llavero del sistema operativo.

**Este comando es obligatorio** si planeas usar la herramienta con `--use-letme` para gestión de credenciales con MFA.

## Requisitos Previos

### Linux

Debes tener instalado `libsecret` y `gnome-keyring`. Consulta la [guía de configuración de libsecret](libsecret-setup.md) para instrucciones detalladas por distribución.

### macOS

Usa el Keychain nativo (ya incluido en macOS).

### Windows

Usa el Credential Manager nativo (ya incluido en Windows).

## Sintaxis

```bash
./generate-aws-inventory --setup-totp
```

## Proceso de Configuración

1. Ejecuta el comando
2. Se te pedirá que ingreses tu secreto TOTP
3. El secreto se almacena de forma segura en el llavero del sistema
4. El secreto se puede recuperar automáticamente para futuras ejecuciones

## Ejemplo de Uso

```bash
$ ./generate-aws-inventory --setup-totp

🔐 Configuración de TOTP para letme

Ingresa tu secreto TOTP: ****************************

✅ Secreto TOTP almacenado correctamente
```

## Obtener tu Secreto TOTP

El secreto TOTP generalmente se proporciona cuando configuras la autenticación MFA en tu sistema de gestión de identidades.

Por ejemplo:

- **AWS IAM**: Al habilitar MFA en tu usuario IAM, se muestra un código QR. El secreto es la cadena base32 asociada al código QR
- **Okta, Azure AD, Google Workspace**: Similar, proporcionan un secreto al configurar MFA

## Almacenamiento Seguro

Los secretos TOTP se almacenan utilizando el sistema de almacenamiento seguro nativo del sistema operativo:

| Sistema Operativo | Almacenamiento              |
| ----------------- | --------------------------- |
| Linux             | libsecret con gnome-keyring |
| macOS             | Keychain                    |
| Windows           | Credential Manager          |

## Recuperación del Secreto

Una vez configurado, no necesitas volver a ingresar el secreto. La herramienta lo recuperará automáticamente cuando uses `--use-letme`.

Si necesitas cambiar o actualizar el secreto, simplemente ejecuta `--setup-totp` nuevamente. El nuevo secreto sobrescribirá el anterior.

## Verificación

Para verificar que el secreto se almacenó correctamente, intenta ejecutar un inventario con `letme`:

```bash
./generate-aws-inventory --use-letme --account NOMBRE_CUENTA --region us-east-1
```

Si el secreto está correctamente configurado, el comando generará un token TOTP automáticamente y obtendrá las credenciales temporales de AWS.

## Solución de Problemas

### Error: "Failed to store TOTP secret"

**En Linux**: Verifica que gnome-keyring esté corriendo:

```bash
pgrep -f "gnome-keyring-daemon"
```

Si no está corriendo, consulta la [guía de configuración de libsecret](libsecret-setup.md).

**En macOS/Windows**: Asegúrate de que tienes permisos para acceder al Keychain/Credential Manager.

### Error: "Cannot retrieve TOTP secret"

El secreto no se ha configurado aún. Ejecuta `--setup-totp` primero.

### El token TOTP generado no funciona

- Verifica que tu reloj del sistema esté sincronizado (TOTP depende de la hora exacta)
- Verifica que el secreto ingresado fue correcto (sin espacios extra)
- Asegúrate de que estás usando el secreto correcto para la cuenta que intentas acceder

## Seguridad

- **Nunca compartas** tu secreto TOTP
- **Nunca almacenes** el secreto en archivos de texto plano
- **Usa un gestor de contraseñas** para guardar una copia de respaldo del secreto (en caso de que necesites reconfigurarlo)

## Relacionado

- [Inventario con letme](init.md#usar-con-letme)
- [Configurar libsecret en Linux](libsecret-setup.md)
