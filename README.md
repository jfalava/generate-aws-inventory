# AWS Inventory Generator

Un wrapper de `awscli` escrito en Bun.

## Requerimientos

- [AWS CLI v2](https://docs.aws.amazon.com/es_es/cli/latest/userguide/getting-started-install.html)
- [letme](https://github.com/lockedinspace/letme) - no es necesario si se usa otro sistema de asunción de roles.

> Esta aplicación usa [Bun Secrets](https://bun.com/docs/runtime/secrets) para almacenar el secreto para generar el TOTP para `letme`.

### Ubuntu/Debian

```sh
sudo apt install libsecret-1-0 libsecret-1-dev gnome-keyring
```

Puedes añadir las siguientes líneas al perfil de tu shell para inicializar el llavero con cada nueva sesión:

```sh
# keyring daemons
if ! pgrep -f "dbus-daemon" > /dev/null; then
  dbus-daemon --session --fork 2>/dev/null
fi
if ! pgrep -f "gnome-keyring-daemon" > /dev/null; then
  gnome-keyring-daemon --start --components=secrets 2>/dev/null
fi
```

### Windows

Usa la solución nativa [Credential Manager](https://support.microsoft.com/es-es/windows/administrador-de-credenciales-en-windows-1b5c916a-6a16-889f-8581-fc16e8165ac0).

### macOS

Usa la solución nativa [Keychain](https://support.apple.com/es-es/guide/keychain-access/kyca1083/mac).

## Ejemplos de uso

```sh
./generate-aws-inventory [PARAMETROS]
```

## Opciones

| Parámetros                       | Descripción                                                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-a`, `--account` <ACCOUNT_NAME> | Especificar el nombre de la cuenta/perfil de AWS. Sin `--use-letme`, usa el perfil de AWS de `~/.aws/config` o `~/.aws/credentials`.                                                                                    |
| `-r`, `--region` <REGION>        | Región(es) de AWS para inventariar. Soporta lista separada por comas (p. ej., us-east-1,us-west-2). Por defecto: us-east-1.                                                                                             |
| `-j`, `--json` <FILE>            | Ruta a un archivo de configuración JSON que contiene un array de cuentas (requiere `--use-letme`).                                                                                                                      |
| `-c`, `--csv` <FILE>             | Ruta a un archivo de configuración CSV que contiene cuentas y regiones (requiere `--use-letme`).                                                                                                                        |
| `--setup-totp`                   | Configurar secreto TOTP para autenticación MFA.                                                                                                                                                                         |
| `-s`, `--silent`                 | Desactivar salida de logging (el logging está activado por defecto).                                                                                                                                                    |
| `-l`, `--use-letme`              | Usar la herramienta letme para gestión de credenciales con MFA (requiere configuración de TOTP).                                                                                                                        |
| `--stop-on-error`                | Detener el procesamiento en el primer error en lugar de continuar.                                                                                                                                                      |
| `--services` <SERVICES>          | Lista separada por comas de servicios para inventariar (p. ej., EC2,RDS,S3,all). Si no se especifica, todos los servicios se describen y se genera un inventario.                                                       |
| `--describe` <PATH>              | Ruta a la carpeta de salida del inventario, directorio padre o archivo CSV para generar descripciones detalladas. Soporta carpetas (procesa todos los CSVs), directorios padre (recursivo) o archivos CSV individuales. |
| `--describe-harder` <CSV_FILE>   | Ruta a un archivo CSV para generar descripciones detalladas exhaustivas con toda la información disponible en tablas markdown estructuradas.                                                                            |
| `--output` <FORMAT>              | Formato de salida para descripciones detalladas (json, text, markdown). Por defecto: markdown.                                                                                                                          |
| `-h`, `--help`                   | Mostrar este mensaje de ayuda.                                                                                                                                                                                          |
| `-e`, `--help-examples`          | Mostrar ejemplos y formatos de archivos.                                                                                                                                                                                |

### Ejemplos:

- Configura el TOTP:

```sh
./generate-aws-inventory --setup-totp
```

- Genera un inventario con tu perfil de AWS por defecto:

```sh
./generate-aws-inventory --region us-east-1
```

- Genera un inventario con un perfil de AWS en específico:

```sh
./generate-aws-inventory --account my-sso-profile --region us-east-1
```

- Genera un inventario con `letme` (requiere de configurar `--setup-totp` primero):

```sh
./generate-aws-inventory --use-letme --account myaccount --region us-east-1
```

- Genera un inventario de una sola cuenta en las regiones `us-east-1, us-west-2 y eu-west-1`:

```sh
./generate-aws-inventory --account myaccount --region us-east-1,us-west-2,eu-west-1
```

- Genera un inventario a partir de un archivo `.json`:

```sh
./generate-aws-inventory --use-letme --json accounts.json
```

- Genera un inventario a partir de un archivo `.csv` con `letme`:

```sh
./generate-aws-inventory --use-letme --csv accounts.csv
```

- Genera un inventario de unos servicios específicos:

```sh
./generate-aws-inventory --account myaccount --services EC2,RDS,S3
```

- Genera un inventario de todos los servicios:

```sh
./generate-aws-inventory --account myaccount --services all
```

- Usa el modo sin logs:

```sh
./generate-aws-inventory --account myaccount --silent
```

- Genera descripciones específicas de una carpeta específica:

```sh
./generate-aws-inventory --describe inventory-output/myaccount-us-east-1-20251003
```

- Genera descripciones específicas todas las carpetas dentro de una carpeta (recursiva)

```sh
./generate-aws-inventory --describe inventory-output
```

- Genera descripciones específicas de un fichero `.csv` específico:

```sh
./generate-aws-inventory --describe inventory-output/myaccount-us-east-1-20251003/EC2-us-east-1-20251003-myaccount.csv
```

- Genera descripciones detalladas exhaustivas con tablas estructuradas:

> Servicios soportados: EC2, RDS, RouteTable, SecurityGroup, LoadBalancer, Lambda, VPC, Subnet, NetworkAcl

```sh
./generate-aws-inventory --describe-harder inventory-output/myaccount-us-east-1-20251003/EC2-us-east-1-20251003-myaccount.csv
```

### Esquemas de archivos de cuentas:

```json
{
  "accounts": [
    {
      "name": "account1",
      "region": "us-east-1"
    },
    {
      "name": "account2",
      "region": "eu-west-1"
    }
  ]
}
```

```csv
account,region
account1,us-east-1
account2,eu-west-1
```
