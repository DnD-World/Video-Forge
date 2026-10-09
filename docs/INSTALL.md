# Installing BYOK-Vid-Creator

## The short version

Double-click **`BYOK-Vid-Creator Setup 0.1.0.exe`**, pick a folder, click
Install. A shortcut appears on the desktop and in the Start menu.

Don't want to install anything? **`byok-vid-creator-portable.exe`** is the same
app as a single file. Double-click it and it runs.

Both files are in the `release` folder after a build.

---

## "Windows protected your PC"

You will probably see this the first time. It appears because the app is not
**code-signed** — signing means buying a certificate each year, and this app
does not have one yet. It is not a sign that anything is wrong with the file.

Click **More info**, then **Run anyway**. Windows remembers the choice.

## What it needs

| | |
|---|---|
| Windows 10 or 11, 64-bit | |
| About 700 MB of disk space for the app | the install includes its own copy of Chromium and of the video tools |
| Space for your videos | a finished seven-minute lesson is roughly 100–200 MB |
| Internet | for stock footage (Pixabay, Pexels), sound search (Freesound), fonts, and any paid engine |

Nothing else needs installing. Video joining and conversion use tools that come
inside the app.

## Where your things are kept

Everything you create or save lives in one folder, separate from the app:

```
%APPDATA%\byok-vid-creator
```

Paste that into the address bar of any File Explorer window to open it.

| inside | what it is |
|---|---|
| `renders\` | your finished videos |
| `media\` | stock footage the app downloaded |
| `fonts\` | subtitle fonts it downloaded |
| `byok.secrets.enc` | your API keys, encrypted by Windows for your account only |

## Uninstalling

**Settings → Apps → Installed apps → BYOK-Vid-Creator → Uninstall**, or the
Uninstall entry in the Start menu.

It asks one question: *remove your data as well?*

- **No** (the safe answer) keeps your keys, settings and finished videos, so a
  reinstall picks up exactly where you left off.
- **Yes** deletes the folder above — **including every video in `renders\`.**
  Copy out anything you want first.

A silent uninstall always answers No.

## What it does not do yet

Said plainly, so nobody finds out the hard way:

- **Not signed** — hence the warning above.
- **Windows only.** There is no Mac or Linux build.
- **No automatic updates.** A new version is a new installer, installed over
  the old one; your data is kept.
- **Your own keys.** Paid engines (ElevenLabs, NVIDIA) and stock libraries need
  keys you add in Backend Settings. Nothing is charged without one.

## Building the installer yourself

```bash
npm install
npm run build-exe
```

The first run downloads about 150 MB of Electron. The files land in `release\`.
