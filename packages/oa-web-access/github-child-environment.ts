const GITHUB_CHILD_ENVIRONMENT_NAMES = [
	"PATH",
	"HOME",
	"USERPROFILE",
	"USER",
	"LOGNAME",
	"LANG",
	"LC_ALL",
	"LC_CTYPE",
	"TERM",
	"TMPDIR",
	"TMP",
	"TEMP",
	"XDG_CONFIG_HOME",
	"APPDATA",
	"LOCALAPPDATA",
	"SYSTEMROOT",
	"WINDIR",
	"COMSPEC",
	"PATHEXT",
	"HTTP_PROXY",
	"HTTPS_PROXY",
	"ALL_PROXY",
	"NO_PROXY",
	"http_proxy",
	"https_proxy",
	"all_proxy",
	"no_proxy",
	"SSL_CERT_FILE",
	"SSL_CERT_DIR",
	"CURL_CA_BUNDLE",
	"GIT_SSL_CAINFO",
	"SSH_AUTH_SOCK",
	"GH_HOST",
	"GH_CONFIG_DIR",
	"GH_TOKEN",
	"GITHUB_TOKEN",
	"GH_ENTERPRISE_TOKEN",
] as const;

/** Minimal environment for the package-owned GitHub CLI and clone subprocesses. */
export function githubChildEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
	const environment: NodeJS.ProcessEnv = {};
	for (const name of GITHUB_CHILD_ENVIRONMENT_NAMES) {
		const value = source[name];
		if (value !== undefined) environment[name] = value;
	}
	return {
		...environment,
		GIT_TERMINAL_PROMPT: "0",
		GCM_INTERACTIVE: "Never",
		GH_PROMPT_DISABLED: "1",
	};
}
