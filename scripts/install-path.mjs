import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Only append a literal, idempotent PATH entry; never source or rewrite user config.
export function configurePath(bindir) {
  if ((process.env.PATH || '').split(':').includes(bindir)) return;
  if (process.env.KW_NO_MODIFY_PATH === '1') {
    console.log(`Shell setup skipped. Run ${join(bindir, 'kw')} directly.`);
    return;
  }
  const home = process.env.HOME;
  const shell = basename(process.env.SHELL || '');
  let files, entry;
  const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
  if (home && (shell === 'bash' || shell === 'zsh')) {
    files = shell === 'zsh'
      ? [join(process.env.ZDOTDIR || home, '.zshrc')]
      : [join(home, '.bashrc'), ['.bash_profile', '.bash_login', '.profile'].map(f => join(home, f)).find(existsSync) || join(home, '.profile')];
    entry = `case ":$PATH:" in *:${quote(bindir)}:*) ;; *) export PATH=${quote(bindir)}:"$PATH" ;; esac`;
  } else if (home && shell === 'fish') {
    files = [join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'fish/conf.d/kw-path.fish')];
    const fishQuote = "'" + bindir.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";
    entry = `fish_add_path --path ${fishQuote}`;
  } else {
    console.log(`Could not detect a supported shell. Run ${join(bindir, 'kw')} directly or add ${bindir} to your shell's PATH.`);
    return;
  }
  try {
    for (const file of files) {
      const content = existsSync(file) ? readFileSync(file, 'utf8') : '';
      if (!content.split('\n').includes(entry)) {
        mkdirSync(dirname(file), { recursive: true });
        appendFileSync(file, `\n# kw CLI\n${entry}\n`);
      }
    }
    console.log(`PATH configured in ${files.join(', ')}. Open a new terminal, then run kw --version.`);
  } catch (error) {
    console.warn(`kw installed, but shell setup failed: ${error.message}. Run ${join(bindir, 'kw')} directly.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  configurePath(process.argv[2]);
}
