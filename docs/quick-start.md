# Guía de Inicio Rápido

Empieza a usar AWS Inventory Generator en 5 minutos.

## Requisitos Previos

1. **AWS CLI v2 instalado**

   ```bash
   aws --version
   ```

   Si no está instalado: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

2. **Credenciales de AWS configuradas**
   ```bash
   aws configure
   ```
   O usa perfiles AWS SSO.

## Primer Inventario

### Opción 1: Inventario Básico

El comando más simple para empezar:

```bash
./generate-aws-inventory --init
```

Esto genera un archivo CSV con todos los recursos en todas las regiones:

```
inventory-output/init-123456789012-20251116.csv
```

### Opción 2: Con Perfil AWS

Si tienes múltiples perfiles:

```bash
./generate-aws-inventory --account my-profile --init
```

### Opción 3: Exportar a Excel

```bash
./generate-aws-inventory --init --export-format xlsx
```

## Casos de Uso Comunes

### 1. Auditoría de Seguridad

Identifica recursos con versiones obsoletas y problemas de seguridad:

```bash
./generate-aws-inventory --init-security --export-format xlsx
```

**Qué detecta**:

- Versiones obsoletas de EKS, Lambda, RDS, ElastiCache
- Recursos sin encriptar
- Acceso público no deseado
- Recursos fuera de VPC

### 2. Optimización de Costos

Encuentra recursos que generan costos innecesarios:

```bash
./generate-aws-inventory --init-cost
```

**Qué detecta**:

- Instancias EC2 detenidas
- Volúmenes EBS desconectados
- Recursos antiguos sin uso

### 3. Inventario Detallado

Vista completa con tags, estado, fechas, etc.:

```bash
./generate-aws-inventory --init-detailed --export-format both
```

Genera tanto CSV como Excel.

### 4. Servicios Específicos

Solo inventariar ciertos servicios:

```bash
./generate-aws-inventory --account my-profile --services EC2,RDS,S3
```

### 5. Múltiples Regiones

```bash
./generate-aws-inventory --account my-profile --region us-east-1,us-west-2,eu-west-1
```

## Leer los Resultados

### CSV en Terminal

```bash
# Ver primeras 10 líneas
head -10 inventory-output/init-*.csv

# Buscar recursos específicos
grep "EC2" inventory-output/init-*.csv

# Contar recursos por tipo
cut -d',' -f1 inventory-output/init-*.csv | sort | uniq -c
```

### Excel

Abre el archivo `.xlsx` en:

- Microsoft Excel
- LibreOffice Calc
- Google Sheets (importar archivo)

**Tip**: Usa filtros y tablas dinámicas para analizar.

## Próximos Pasos

Una vez que tengas tu primer inventario:

1. **Ver recursos obsoletos** (si usaste `--init-security`):

   ```bash
   grep "Deprecated\|End of Life" inventory-output/init-security-*.csv
   ```

2. **Generar descripciones detalladas**:

   ```bash
   ./generate-aws-inventory --describe inventory-output/init-*
   ```

3. **Explorar otros modos**:
   - [Inventario Detallado](init-detailed.md) - Información completa
   - [Inventario de Costos](init-cost.md) - Optimización
   - [Descripciones Exhaustivas](describe-harder.md) - Análisis profundo

4. **Automatizar** con archivos de configuración:
   - [Archivos JSON/CSV](configuration-files.md)
   - Scripts personalizados

## Solución de Problemas Rápidos

### "Unable to locate credentials"

```bash
aws configure
# Ingresa tus credenciales AWS
```

### "AWS CLI not found"

Instala AWS CLI v2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

### "Access Denied"

Verifica que tus credenciales tengan permisos de lectura. La política recomendada es `ReadOnlyAccess`.

### Inventario tarda mucho

Es normal. Para ~50 recursos en 15 regiones puede tomar 5-10 minutos. La herramienta consulta todas las regiones habilitadas.

Para acelerar, usa `--services` para inventariar solo servicios específicos.

## Ayuda

```bash
# Ver todas las opciones
./generate-aws-inventory --help

# Ver ejemplos
./generate-aws-inventory --help-examples
```

## Recursos

- [Documentación completa](docs.md)
- [Modos de autenticación](authentication.md)
- [Lista de servicios](services-list.md)
- [Formatos de exportación](export-format.md)
