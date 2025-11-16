# Configuración de libsecret en Linux

Esta herramienta utiliza [Bun Secrets](https://bun.com/docs/runtime/secrets) para almacenar de forma segura el secreto TOTP necesario para la autenticación MFA con `letme`. En Linux, esto requiere `libsecret` y `gnome-keyring`.

## Ubuntu / Debian

### Instalar paquetes necesarios

```bash
sudo apt update
sudo apt install libsecret-1-0 libsecret-1-dev gnome-keyring
```

### Configurar el llavero automáticamente

Añade las siguientes líneas a tu archivo de perfil de shell (`~/.bashrc`, `~/.zshrc`, etc.) para inicializar el llavero en cada sesión:

```bash
# Inicializar daemons del llavero
if ! pgrep -f "dbus-daemon" > /dev/null; then
  dbus-daemon --session --fork 2>/dev/null
fi

if ! pgrep -f "gnome-keyring-daemon" > /dev/null; then
  gnome-keyring-daemon --start --components=secrets 2>/dev/null
fi
```

### Verificar instalación

```bash
# Verificar que libsecret está instalado
ldconfig -p | grep libsecret

# Debería mostrar algo como:
# libsecret-1.so.0 (libc6,x86-64) => /usr/lib/x86_64-linux-gnu/libsecret-1.so.0
```

## Fedora / RHEL / CentOS

### Fedora (22+) / RHEL 8+ / CentOS 8+

```bash
sudo dnf install libsecret libsecret-devel gnome-keyring
```

### RHEL 7 / CentOS 7

```bash
sudo yum install libsecret libsecret-devel gnome-keyring
```

### Configurar el llavero

Añade a `~/.bashrc` o `~/.zshrc`:

```bash
# Inicializar daemons del llavero
if ! pgrep -f "dbus-daemon" > /dev/null; then
  dbus-daemon --session --fork 2>/dev/null
fi

if ! pgrep -f "gnome-keyring-daemon" > /dev/null; then
  gnome-keyring-daemon --start --components=secrets 2>/dev/null
fi
```

## Arch Linux / Manjaro

```bash
sudo pacman -S libsecret gnome-keyring
```

### Configurar el llavero

Añade a `~/.bashrc` o `~/.zshrc`:

```bash
# Inicializar daemons del llavero
if ! pgrep -f "dbus-daemon" > /dev/null; then
  dbus-daemon --session --fork 2>/dev/null
fi

if ! pgrep -f "gnome-keyring-daemon" > /dev/null; then
  gnome-keyring-daemon --start --components=secrets 2>/dev/null
fi
```

## openSUSE

```bash
sudo zypper install libsecret-1-0 libsecret-devel gnome-keyring
```

### Configurar el llavero

Añade a `~/.bashrc` o `~/.zshrc`:

```bash
# Inicializar daemons del llavero
if ! pgrep -f "dbus-daemon" > /dev/null; then
  dbus-daemon --session --fork 2>/dev/null
fi

if ! pgrep -f "gnome-keyring-daemon" > /dev/null; then
  gnome-keyring-daemon --start --components=secrets 2>/dev/null
fi
```

## Alpine Linux

```bash
sudo apk add libsecret gnome-keyring dbus
```

### Configurar el llavero

Añade a `~/.bashrc` o `~/.zshrc`:

```bash
# Inicializar daemons del llavero
if ! pgrep -f "dbus-daemon" > /dev/null; then
  dbus-daemon --session --fork 2>/dev/null
fi

if ! pgrep -f "gnome-keyring-daemon" > /dev/null; then
  gnome-keyring-daemon --start --components=secrets 2>/dev/null
fi
```

## Verificación Post-Instalación

Después de instalar y configurar, verifica que todo funciona:

1. Cierra y abre una nueva terminal
2. Verifica que los procesos están corriendo:

```bash
pgrep -f "dbus-daemon"
pgrep -f "gnome-keyring-daemon"
```

Ambos comandos deberían devolver IDs de proceso.

3. Intenta configurar el TOTP:

```bash
./generate-aws-inventory --setup-totp
```

Si todo está correctamente configurado, se te pedirá que ingreses tu secreto TOTP.

## Solución de Problemas

### Error: "Failed to unlock the keyring"

Puede que necesites crear manualmente un llavero predeterminado:

```bash
# Crear un llavero predeterminado
gnome-keyring-daemon --unlock
```

Presiona Enter cuando se te pida una contraseña para crear un llavero sin contraseña.

### Error: "Cannot autolaunch D-Bus without X11 $DISPLAY"

Si estás usando SSH sin X11 forwarding:

```bash
# Exporta una variable DISPLAY dummy
export DISPLAY=:0

# Luego inicia dbus
dbus-daemon --session --fork
gnome-keyring-daemon --start --components=secrets
```

### El daemon no persiste entre sesiones

Asegúrate de que las líneas de inicialización están en el archivo correcto de tu shell:

- **Bash**: `~/.bashrc`
- **Zsh**: `~/.zshrc`
- **Fish**: `~/.config/fish/config.fish`

Y que estás usando una terminal de login que ejecuta estos archivos.

## Alternativas a gnome-keyring

Si no deseas usar gnome-keyring, puedes usar:

### KDE Wallet (para usuarios de KDE)

```bash
# Ubuntu/Debian
sudo apt install kwalletmanager kwallet-kf5

# Arch
sudo pacman -S kwallet

# Fedora
sudo dnf install kwalletmanager
```

### Pass (gestor de contraseñas para línea de comandos)

```bash
# Ubuntu/Debian
sudo apt install pass

# Arch
sudo pacman -S pass

# Fedora
sudo dnf install pass
```

Sin embargo, la integración nativa de Bun es con libsecret/gnome-keyring, por lo que estas alternativas pueden requerir configuración adicional.

## Referencias

- [Documentación de Bun Secrets](https://bun.com/docs/runtime/secrets)
- [libsecret en GitLab](https://gitlab.gnome.org/GNOME/libsecret)
- [GNOME Keyring](https://wiki.gnome.org/Projects/GnomeKeyring)
