export const CHAR_FORWARD_SLASH = 47; /* / */
export const CHAR_DOT = 46; /* . */

export function isPosixPathSeparator(code: number): boolean {
	return code === CHAR_FORWARD_SLASH;
}

export function resolve(...pathSegments: string[]): string {
	let resolvedPath = "";
	let resolvedAbsolute = false;

	for (let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
		let path: string;

		if (i >= 0) path = pathSegments[i];
		else {
			path = "/";
		}

		// Skip empty entries
		if (path.length === 0) {
			continue;
		}

		resolvedPath = `${path}/${resolvedPath}`;
		resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
	}

	// At this point the path should be resolved to a full absolute path, but
	// handle relative paths to be safe (might happen when process.cwd() fails)

	// Normalize the path
	resolvedPath = normalizeString(
		resolvedPath,
		!resolvedAbsolute,
		"/",
		isPosixPathSeparator,
	);

	if (resolvedAbsolute) {
		if (resolvedPath.length > 0) return `/${resolvedPath}`;
		else return "/";
	} else if (resolvedPath.length > 0) return resolvedPath;
	else return ".";
}

export function normalizeString(
	path: string,
	allowAboveRoot: boolean,
	separator: string,
	isPathSeparator: (code: number) => boolean,
): string {
	let res = "";
	let lastSegmentLength = 0;
	let lastSlash = -1;
	let dots = 0;
	let code: number | undefined;
	for (let i = 0, len = path.length; i <= len; ++i) {
		if (i < len) code = path.charCodeAt(i);
		else if (isPathSeparator(code!)) break;
		else code = CHAR_FORWARD_SLASH;

		if (isPathSeparator(code!)) {
			if (lastSlash === i - 1 || dots === 1) {
				// NOOP
			} else if (lastSlash !== i - 1 && dots === 2) {
				if (
					res.length < 2 ||
					lastSegmentLength !== 2 ||
					res.charCodeAt(res.length - 1) !== CHAR_DOT ||
					res.charCodeAt(res.length - 2) !== CHAR_DOT
				) {
					if (res.length > 2) {
						const lastSlashIndex = res.lastIndexOf(separator);
						if (lastSlashIndex === -1) {
							res = "";
							lastSegmentLength = 0;
						} else {
							res = res.slice(0, lastSlashIndex);
							lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
						}
						lastSlash = i;
						dots = 0;
						continue;
					} else if (res.length === 2 || res.length === 1) {
						res = "";
						lastSegmentLength = 0;
						lastSlash = i;
						dots = 0;
						continue;
					}
				}
				if (allowAboveRoot) {
					if (res.length > 0) res += `${separator}..`;
					else res = "..";
					lastSegmentLength = 2;
				}
			} else {
				if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
				else res = path.slice(lastSlash + 1, i);
				lastSegmentLength = i - lastSlash - 1;
			}
			lastSlash = i;
			dots = 0;
		} else if (code === CHAR_DOT && dots !== -1) {
			++dots;
		} else {
			dots = -1;
		}
	}
	return res;
}

export function relative(from: string, to: string): string {
	if (from === to) return "";

	from = resolve(from);
	to = resolve(to);

	if (from === to) return "";

	// Trim any leading backslashes
	let fromStart = 1;
	const fromEnd = from.length;
	for (; fromStart < fromEnd; ++fromStart) {
		if (from.charCodeAt(fromStart) !== CHAR_FORWARD_SLASH) break;
	}
	const fromLen = fromEnd - fromStart;

	// Trim any leading backslashes
	let toStart = 1;
	const toEnd = to.length;
	for (; toStart < toEnd; ++toStart) {
		if (to.charCodeAt(toStart) !== CHAR_FORWARD_SLASH) break;
	}
	const toLen = toEnd - toStart;

	// Compare paths to find the longest common path from root
	const length = fromLen < toLen ? fromLen : toLen;
	let lastCommonSep = -1;
	let i = 0;
	for (; i <= length; ++i) {
		if (i === length) {
			if (toLen > length) {
				if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
					// We get here if `from` is the exact base path for `to`.
					// For example: from='/foo/bar'; to='/foo/bar/baz'
					return to.slice(toStart + i + 1);
				} else if (i === 0) {
					// We get here if `from` is the root
					// For example: from='/'; to='/foo'
					return to.slice(toStart + i);
				}
			} else if (fromLen > length) {
				if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
					// We get here if `to` is the exact base path for `from`.
					// For example: from='/foo/bar/baz'; to='/foo/bar'
					lastCommonSep = i;
				} else if (i === 0) {
					// We get here if `to` is the root.
					// For example: from='/foo'; to='/'
					lastCommonSep = 0;
				}
			}
			break;
		}
		const fromCode = from.charCodeAt(fromStart + i);
		const toCode = to.charCodeAt(toStart + i);
		if (fromCode !== toCode) break;
		else if (fromCode === CHAR_FORWARD_SLASH) lastCommonSep = i;
	}

	let out = "";
	// Generate the relative path based on the path difference between `to`
	// and `from`
	for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
		if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
			if (out.length === 0) out += "..";
			else out += "/..";
		}
	}

	// Lastly, append the rest of the destination (`to`) path that comes after
	// the common path parts
	if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
	else {
		toStart += lastCommonSep;
		if (to.charCodeAt(toStart) === CHAR_FORWARD_SLASH) ++toStart;
		return to.slice(toStart);
	}
}
