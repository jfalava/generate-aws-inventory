# Métodos de Autenticación

La herramienta soporta tres modos de autenticación con AWS.

## 1. Credenciales por Defecto

Usa las credenciales configuradas en `~/.aws/credentials` o variables de entorno.

```bash
./generate-aws-inventory --init
```

**Cuándo usar**: Cuando tienes un solo perfil configurado o usas variables de entorno.

## 2. Perfil de AWS

Usa un perfil específico de `~/.aws/config` o `~/.aws/credentials`. Soporta perfiles SSO.

```bash
./generate-aws-inventory --account my-profile --init
```

**Búsqueda de perfiles**:

1. `[profile <name>]` en `~/.aws/config` (perfiles SSO)
2. `[<name>]` en `~/.aws/credentials`
3. `[<name>]` en `~/.aws/config`

**Ejemplo de perfil SSO** (`~/.aws/config`):

```ini
[profile my-sso-profile]
sso_start_url = https://my-company.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = AdministratorAccess
region = us-east-1
```

**Cuándo usar**: Cuando tienes múltiples perfiles AWS o usas AWS SSO.

## 3. letme con MFA

Usa la herramienta [letme](https://github.com/lockedinspace/letme) para gestión de credenciales con autenticación MFA.

### Configuración Inicial

1. **Instalar letme**: Sigue las instrucciones en https://github.com/lockedinspace/letme

2. **Configurar TOTP**:

   ```bash
   ./generate-aws-inventory --setup-totp
   ```

   Se te pedirá ingresar tu secreto TOTP. Este se almacena de forma segura en el llavero del sistema.

3. **Usar con letme**:
   ```bash
   ./generate-aws-inventory --use-letme --account NOMBRE_CUENTA --init
   ```

**Cómo funciona**:

- La herramienta genera automáticamente un token TOTP usando el secreto almacenado
- Ejecuta `letme obtain <cuenta> --inline-mfa <token>` para obtener credenciales temporales
- Las credenciales se pueden refrescar automáticamente durante operaciones largas

**Cuándo usar**: Cuando necesitas MFA y gestionas múltiples cuentas con letme.

### Requisitos para letme

- **Linux**: libsecret y gnome-keyring ([guía de instalación](libsecret-setup.md))
- **macOS**: Keychain (incluido)
- **Windows**: Credential Manager (incluido)

## Comparación

| Método      | MFA     | Multi-cuenta | SSO | Complejidad |
| ----------- | ------- | ------------ | --- | ----------- |
| Por defecto | ❌      | ❌           | ❌  | Baja        |
| Perfil AWS  | Depende | ✅           | ✅  | Media       |
| letme       | ✅      | ✅           | ❌  | Alta        |

## Ejemplos por Caso de Uso

### Desarrollo local simple

```bash
# Configurar credenciales una vez
aws configure

# Usar la herramienta
./generate-aws-inventory --init
```

### Múltiples cuentas con SSO

```bash
# Autenticar SSO
aws sso login --profile prod

# Inventario de producción
./generate-aws-inventory --account prod --init-security

# Autenticar otra cuenta
aws sso login --profile staging

# Inventario de staging
./generate-aws-inventory --account staging --init-security
```

### Múltiples cuentas con letme y MFA

```bash
# Configurar TOTP una vez
./generate-aws-inventory --setup-totp

# Inventariar múltiples cuentas automáticamente
./generate-aws-inventory --use-letme --account prod --init-security
./generate-aws-inventory --use-letme --account staging --init-security
./generate-aws-inventory --use-letme --account dev --init-security
```

## Permisos Necesarios

La herramienta requiere permisos de **solo lectura** para:

- EC2: `ec2:Describe*`
- RDS: `rds:Describe*`
- S3: `s3:ListAllMyBuckets`, `s3:GetBucketLocation`, etc.
- Lambda: `lambda:List*`, `lambda:Get*`
- IAM: `iam:List*`, `iam:Get*`
- Y servicios adicionales según lo que necesites inventariar

**Política recomendada**: `ReadOnlyAccess` managed policy de AWS.

## Solución de Problemas

### Error: "Unable to locate credentials"

**Con credenciales por defecto**:

```bash
aws configure
```

**Con perfil**:

```bash
# Verificar que el perfil existe
cat ~/.aws/config
aws sso login --profile my-profile
```

### Error: "Cannot retrieve TOTP secret"

El secreto TOTP no está configurado:

```bash
./generate-aws-inventory --setup-totp
```

### Error: "Failed to unlock the keyring" (Linux)

El llavero no está corriendo. Ver [guía de libsecret](libsecret-setup.md).

## Relacionado

- [Configurar TOTP](setup-totp.md)
- [Configurar libsecret (Linux)](libsecret-setup.md)
- [Archivos de Configuración](configuration-files.md)
