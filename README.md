# AWS Inventory Generator

Un generador de inventarios de AWS, escrito en Bun

## Inicio Rápido

```bash
# Inventario básico
./generate-aws-inventory --init

# Auditoría de seguridad (detecta versiones obsoletas)
./generate-aws-inventory --init-security --export-format xlsx

# Optimización de costos
./generate-aws-inventory --init-cost
```

**→ [Guía de inicio completa](docs/quick-start.md)**

## Características

- [x] **41 tipos de recursos** AWS
- [x] **Detección automática** de versiones obsoletas (EKS, Lambda, RDS, ElastiCache)
- [x] **4 modos**: básico, detallado, seguridad, costos
- [x] **Exportación** CSV, Excel o ambos
- [x] **Multi-cuenta** y multi-región

## Requisitos

- **Solo Linux**: [libsecret](docs/libsecret-setup.md) (solo para MFA con letme)

## Desarrollo local

Necesitas [Bun](https://bun.com) instalado en tu entorno.

```bash
# Instala Bun: https://bun.com
bun install

# Opcional: lint y typecheck
bun run lint
bun run typecheck

# Crear binarios para todas las plataformas
bun run build:all
```

Esto genera archivos `.zip` en `dist/` con los ejecutables compilados para cada plataforma.

**Scripts individuales:**

```bash
bun run build:windows-x64
bun run build:linux-x64
bun run build:macOS-arm
```

## Documentación

**→ [Documentación completa](docs/docs.md)**

### Guías Principales

- [Guía de Inicio Rápido](docs/quick-start.md)
- [Modos de Inventario](docs/init.md)
- [Auditoría de Seguridad](docs/init-security.md)
- [Autenticación](docs/authentication.md)
- [Lista de Servicios](docs/services-list.md)

## Ejemplos

```bash
# Con perfil AWS
./generate-aws-inventory --account my-profile --init-detailed

# Servicios específicos
./generate-aws-inventory --services EC2,RDS,S3

# Múltiples regiones (estándar)
./generate-aws-inventory --region us-east-1,us-west-2,eu-west-1

# Limitar regiones en init (evita errores de rate limit)
./generate-aws-inventory --init --limit-regions us-east-1,us-west-2

# Auditoría de seguridad en regiones específicas
./generate-aws-inventory --init-security --limit-regions us-east-1,eu-west-1

# Con MFA (letme)
./generate-aws-inventory --setup-totp  # configurar una vez
./generate-aws-inventory --use-letme --account CUENTA --init
```

## Salida

```
inventory-output/
├── init-<accountId>-<YYYYMMDD>.csv         # Básico
├── init-security-<accountId>-<YYYYMMDD>.csv  # Seguridad
└── init-cost-<accountId>-<YYYYMMDD>.xlsx     # Costos (Excel)
```

## Enlaces

- [Documentación](docs/docs.md)
- [letme](https://www.getletme.com/)
