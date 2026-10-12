#!/bin/sh
# Install or reinstall kw from Git on macOS/Linux. No sudo required.
set -eu

repo=${KW_REPO:-https://github.com/ChrisMarxDev/knowledge-graph.git}
ref=${KW_REF:-HEAD}
prefix=${KW_PREFIX:-"$HOME/.local"}
usage() {
  cat <<'HELP'
Usage: sh install.sh [--repo URL_OR_PATH] [--ref BRANCH_TAG_OR_SHA] [--prefix DIR] [--no-modify-path]

Build and install kw from Git; rerun to update/reinstall.
  --repo    Git source (default: https://github.com/ChrisMarxDev/knowledge-graph.git)
  --ref     Git ref to fetch (default: HEAD, the remote default branch)
  --prefix  Installation prefix (default: ~/.local)
  --no-modify-path  Skip automatic Bash/Zsh/Fish PATH configuration

Environment defaults: KW_REPO, KW_REF, KW_PREFIX; KW_NO_MODIFY_PATH=1 skips shell setup.
Requires Git, Node.js 22.12+, and npm. Uses existing Git authentication.
Installs PREFIX/bin/kw and a managed build under PREFIX/share/kw.
HELP
}
die() { printf 'kw installer: %s\n' "$*" >&2; exit 1; }
while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-modify-path) export KW_NO_MODIFY_PATH=1; shift ;;
    --help|-h) usage; exit 0 ;;
    --repo|--ref|--prefix)
      [ "$#" -ge 2 ] && [ -n "$2" ] || die "Missing value for $1"
      case "$1" in --repo) repo=$2 ;; --ref) ref=$2 ;; --prefix) prefix=$2 ;; esac
      shift 2 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done
case "$ref" in -*) die 'Git ref must not start with a dash' ;; esac
for tool in git node npm; do command -v "$tool" >/dev/null 2>&1 || die "Install $tool first"; done
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); process.exit(major>22 || major===22 && minor>=12 ? 0 : 1)' || die 'Node.js 22.12 or newer is required'
# Resolve local repo paths before entering the build directory.
if [ -d "$repo" ]; then repo=$(cd "$repo" && pwd -P); fi
case "$prefix" in /*) ;; *) prefix=$PWD/$prefix ;; esac
mkdir -p "$prefix"
prefix=$(cd "$prefix" && pwd -P)
root=$prefix/share/kw
bindir=$prefix/bin
mkdir -p "$root" "$bindir"
lock=$root/.install-lock
mkdir "$lock" 2>/dev/null || die "Another install may be running. If it was interrupted, remove $lock and retry."
stage=
link_tmp=
activated=false
cleanup() {
  [ -z "$link_tmp" ] || rm -f "$link_tmp"
  if [ "$activated" = false ] && [ -n "$stage" ]; then rm -rf "$stage"; fi
  rmdir "$lock" 2>/dev/null || :
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

previous=
if [ -L "$bindir/kw" ]; then
  target=$(readlink "$bindir/kw")
  case "$target" in
    "$root"/build.*/bin/kw.js)
      previous=${target%/bin/kw.js}
      # Only replace/remove builds bearing our ownership marker in this exact root.
      [ "$(dirname "$previous")" = "$root" ] && [ -f "$previous/.kw-git-install" ] || die "$bindir/kw is not managed by this installer" ;;
    *) die "$bindir/kw already points to another installation; choose a different --prefix or move it first" ;;
  esac
elif [ -e "$bindir/kw" ]; then
  die "$bindir/kw already exists; choose a different --prefix or move it first"
fi
stage=$(mktemp -d "$root/build.XXXXXXXX")
printf 'Fetching kw (%s)…\n' "$ref"
git init --quiet "$stage"
git -C "$stage" remote add origin "$repo"
# Disable interactive prompts in a piped installer. Existing credentials/SSH agents still work.
GIT_TERMINAL_PROMPT=0 git -C "$stage" fetch --quiet --depth 1 origin "$ref"
git -C "$stage" checkout --quiet --detach FETCH_HEAD
commit=$(git -C "$stage" rev-parse --short=12 HEAD)
[ -f "$stage/package-lock.json" ] && [ -f "$stage/bin/kw.js" ] || die 'The selected Git revision does not contain the kw application; push the implementation or select another ref'
printf 'Building kw at %s…\n' "$commit"
(
  cd "$stage"
  npm ci --include=dev --no-audit --no-fund
  npm run build
  [ -f dist/ui/index.html ] || die 'Build did not produce the explorer UI'
  node bin/kw.js --version
)
chmod +x "$stage/bin/kw.js"
printf '%s\n' "$commit" > "$stage/.kw-git-install"
link_tmp=$bindir/.kw-link.$$
ln -s "$stage/bin/kw.js" "$link_tmp"
# rename replaces the link itself atomically on both macOS and Linux.
node -e 'require("node:fs").renameSync(process.argv[1],process.argv[2])' "$link_tmp" "$bindir/kw"
link_tmp=
activated=true
if [ -n "$previous" ]; then rm -rf "$previous"; fi
printf '\nInstalled kw (%s) at %s/kw\n' "$commit" "$bindir"
printf 'Rerun this installer with the same options to update. Restart any running kw view server after updating.\n'
if [ -f "$stage/scripts/install-path.mjs" ]; then
  node "$stage/scripts/install-path.mjs" "$bindir"
else
  printf 'Run %s/kw directly if its directory is not on PATH.\n' "$bindir"
fi
