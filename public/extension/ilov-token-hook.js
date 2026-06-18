(() => {
    if (window.__ILOV_LOVABLE_TOKEN_HOOK__) return;
    window.__ILOV_LOVABLE_TOKEN_HOOK__ = true;

    const MESSAGE_SOURCE = "ILOV_LOVABLE_TOKEN_HOOK";
    const MESSAGE_TYPE = "ILOV_LOVABLE_TOKEN_FROM_PAGE";

    function isNonEmptyString(value) {
        return typeof value === "string" && value.trim().length > 0;
    }

    function isLovableUrl(url) {
        try {
            const hostname = new URL(url, window.location.href).hostname.toLowerCase();
            return (
                hostname === "lovable.dev" ||
                hostname.endsWith(".lovable.dev") ||
                hostname === "lovable.app" ||
                hostname.endsWith(".lovable.app")
            );
        } catch {
            return false;
        }
    }

    function requestUrlFrom(input) {
        if (typeof input === "string") return input;
        if (input instanceof URL) return input.href;
        if (input && typeof input.url === "string") return input.url;
        return "";
    }

    function tokenFromAuthorization(value) {
        if (!isNonEmptyString(value)) return undefined;
        const match = value.trim().match(/^Bearer\s+(.+)$/i);
        return (match?.[1] || "").trim();
    }

    function tokenFromHeaders(headers) {
        if (!headers) return undefined;

        try {
            if (typeof Headers !== "undefined" && headers instanceof Headers) {
                return tokenFromAuthorization(headers.get("authorization") || headers.get("Authorization"));
            }

            if (Array.isArray(headers)) {
                for (const item of headers) {
                    if (!Array.isArray(item)) continue;
                    if (String(item[0] || "").toLowerCase() === "authorization") return tokenFromAuthorization(String(item[1] || ""));
                }
                return undefined;
            }

            if (typeof headers === "object") {
                const value =
                    headers.authorization ||
                    headers.Authorization ||
                    Object.entries(headers).find(([key]) => String(key).toLowerCase() === "authorization")?.[1];
                return tokenFromAuthorization(String(value || ""));
            }
        } catch {}

        return undefined;
    }

    function contextFromHeaders(headers) {
        const context = {};
        if (!headers) return context;

        const visit = (name, value) => {
            const key = String(name || "").toLowerCase();
            const text = String(value || "").trim();
            if (!text) return;
            if (key === "authorization") context.token = tokenFromAuthorization(text);
            if (key === "x-browser-session-id") context.browserSessionId = text;
            if (key === "x-client-git-sha") context.clientGitSha = text;
        };

        try {
            if (typeof Headers !== "undefined" && headers instanceof Headers) {
                headers.forEach((value, name) => visit(name, value));
            } else if (Array.isArray(headers)) {
                headers.forEach((item) => Array.isArray(item) && visit(item[0], item[1]));
            } else if (typeof headers === "object") {
                Object.entries(headers).forEach(([name, value]) => visit(name, value));
            }
        } catch {}

        if (!context.token) context.token = tokenFromHeaders(headers);
        return context;
    }

    function safeJsonParse(value) {
        if (!isNonEmptyString(value)) return undefined;
        try {
            return JSON.parse(value);
        } catch {
            return undefined;
        }
    }

    function isBlockedContextValue(value) {
        const text = String(value || "").trim().toLowerCase();
        return !text || /\s/.test(text) || /^https?:\/\//i.test(text) || /[/?#]/.test(text) || ["salvo", "detectado", "workspace", "workspace pendente", "pendente", "templates", "template"].includes(text);
    }

    function isLikelyBrowserSessionId(value) {
        const text = String(value || "").trim();
        return /^bsess_[A-Za-z0-9_-]+$/i.test(text) || /^[A-Za-z0-9_-]{16,32}$/.test(text);
    }

    function isValidProjectId(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || "").trim());
    }

    function sanitizeWorkspaceId(value, optionsOrBrowserSessionId = {}) {
        const options =
            typeof optionsOrBrowserSessionId === "object" && optionsOrBrowserSessionId !== null ?
            optionsOrBrowserSessionId :
            {
                browserSessionId: optionsOrBrowserSessionId
            };
        const text = String(value || "").trim();
        if (isBlockedContextValue(text)) return undefined;
        if (options.browserSessionId && text === String(options.browserSessionId).trim()) return undefined;
        if (isValidProjectId(text)) return text;
        if (/^(ws|workspace)_[A-Za-z0-9_-]{8,}$/i.test(text)) return text;
        if (options.trusted === true && /^[A-Za-z0-9_-]{6,96}$/.test(text) && !/^bsess_/i.test(text)) return text;
        if (/^[A-Za-z0-9_-]{33,96}$/.test(text) && !isLikelyBrowserSessionId(text)) return text;
        return undefined;
    }

    function isProjectKeyPath(path = []) {
        const key = String(path[path.length - 1] || "").toLowerCase();
        const joined = path.map((item) => String(item || "").toLowerCase()).join(".");
        return key === "projectid" || key === "project_id" || key === "currentprojectid" || key === "current_project_id" || joined.includes("projectid") || joined.includes("project_id") || joined.includes("currentprojectid") || joined.includes("current_project_id") || (joined.includes("project") && (key === "id" || key === "uuid"));
    }

    function isWorkspaceKeyPath(path = []) {
        const key = String(path[path.length - 1] || "").toLowerCase();
        const joined = path.map((item) => String(item || "").toLowerCase()).join(".");
        return key === "workspaceid" || key === "workspace_id" || key === "currentworkspaceid" || key === "current_workspace_id" || joined.includes("workspaceid") || joined.includes("workspace_id") || joined.includes("currentworkspaceid") || joined.includes("current_workspace_id") || key === "workspace" || ((key === "id" || key === "uuid" || key === "slug") && joined.includes("workspace"));
    }

    function isBrowserSessionKeyPath(path = []) {
        const joined = path.map((item) => String(item || "").toLowerCase()).join(".");
        return joined.includes("x-browser-session-id") || joined.includes("browsersessionid") || joined.includes("browser_session_id") || (joined.includes("browser") && joined.includes("session"));
    }

    function collectBodyContext(value, path = [], output = {}, depth = 0) {
        if (value == null || depth > 6) return output;
        if (typeof value === "string" || typeof value === "number") {
            const text = String(value).trim();
            if (!text) return output;
            if (isBrowserSessionKeyPath(path) && !output.browserSessionId) output.browserSessionId = text;
            if (isProjectKeyPath(path) && !output.projectId && isValidProjectId(text)) output.projectId = text;
            if (isWorkspaceKeyPath(path) && !output.workspaceId && !/(^|\.)slug$/i.test(path.join("."))) output.workspaceId = sanitizeWorkspaceId(text, {
                browserSessionId: output.browserSessionId,
                trusted: true
            });
            return output;
        }
        if (Array.isArray(value)) {
            value.forEach((item, index) => collectBodyContext(item, [...path, String(index)], output, depth + 1));
            return output;
        }
        if (typeof value === "object") {
            Object.entries(value).forEach(([key, item]) => collectBodyContext(item, [...path, key], output, depth + 1));
        }
        return output;
    }

    function contextFromBody(body) {
        if (!body || typeof body !== "string") return {};
        return collectBodyContext(safeJsonParse(body) || {});
    }

    function responsePathname(requestUrl) {
        try {
            return new URL(requestUrl, window.location.href).pathname;
        } catch {
            return String(requestUrl || "");
        }
    }

    function listFromWorkspaceResponse(value) {
        if (Array.isArray(value)) return value;
        if (!value || typeof value !== "object") return [];
        if (Array.isArray(value.workspaces)) return value.workspaces;
        if (Array.isArray(value.data)) return value.data;
        if (Array.isArray(value.items)) return value.items;
        if (Array.isArray(value.results)) return value.results;
        return [];
    }

    function firstWorkspaceIdFromList(list, browserSessionId) {
        for (const item of list || []) {
            if (!item || typeof item !== "object") continue;
            const workspaceId = sanitizeWorkspaceId(item.id || item.uuid || item.workspace_id || item.workspaceId, {
                browserSessionId,
                trusted: true,
            });
            if (workspaceId) return workspaceId;
        }
        return undefined;
    }

    function contextFromLovableResponse(data, requestUrl) {
        if (!data || typeof data !== "object") return {};
        const pathname = responsePathname(requestUrl);
        const context = collectBodyContext(data, [], {}, 0);
        let workspaceId;

        if (/\/projects\/[^/?#]+\/workspace(?:[/?#]|$)/i.test(pathname)) {
            workspaceId = sanitizeWorkspaceId(data.id || data.workspace?.id || data.workspace_id || data.workspaceId || data.data?.id || data.data?.workspace_id, {
                browserSessionId: context.browserSessionId,
                trusted: true,
            });
        }

        if (!workspaceId && /\/user\/workspaces(?:[/?#]|$)/i.test(pathname)) {
            workspaceId = firstWorkspaceIdFromList(listFromWorkspaceResponse(data), context.browserSessionId);
        }

        if (!workspaceId && pathname.toLowerCase().includes("workspace")) {
            workspaceId = context.workspaceId;
        }

        return {
            ...context,
            workspaceId: workspaceId || context.workspaceId,
        };
    }

    function inspectFetchResponse(response, requestUrl, captureSource) {
        if (!response || !isLovableUrl(requestUrl) || typeof response.clone !== "function") return;
        try {
            const contentType = response.headers?.get?.("content-type") || "";
            if (contentType && !/json|text/i.test(contentType)) return;
            response
                .clone()
                .text()
                .then((text) => {
                    const parsed = safeJsonParse(text);
                    if (!parsed) return;
                    emitContext(contextFromLovableResponse(parsed, requestUrl), requestUrl, captureSource);
                })
                .catch(() => {});
        } catch {}
    }

    function inspectXhrResponse(xhr, requestUrl, captureSource) {
        if (!xhr || !isLovableUrl(requestUrl)) return;
        try {
            const responseType = xhr.responseType || "";
            if (responseType && responseType !== "text" && responseType !== "json") return;
            const parsed = responseType === "json" ? xhr.response : safeJsonParse(xhr.responseText || "");
            if (!parsed) return;
            emitContext(contextFromLovableResponse(parsed, requestUrl), requestUrl, captureSource);
        } catch {}
    }

    function emitContext(context, requestUrl, captureSource) {
        if (!isLovableUrl(requestUrl)) return;
        const payload = {
            ...(context || {})
        };
        if (!isNonEmptyString(payload.token) && !isNonEmptyString(payload.projectId) && !isNonEmptyString(payload.workspaceId) && !isNonEmptyString(payload.browserSessionId) && !isNonEmptyString(payload.clientGitSha)) return;
        window.postMessage({
                source: MESSAGE_SOURCE,
                type: MESSAGE_TYPE,
                ...payload,
                requestUrl,
                captureSource,
            },
            window.location.origin,
        );
    }

    const originalFetch = window.fetch;
    if (typeof originalFetch === "function") {
        window.fetch = function ilovFetch(input, init) {
            let requestUrl = "";
            try {
                requestUrl = requestUrlFrom(input);
                const headerContext = {
                    ...contextFromHeaders(input?.headers),
                    ...contextFromHeaders(init?.headers)
                };
                const bodyContext = contextFromBody(init?.body);
                emitContext({
                    ...headerContext,
                    ...bodyContext
                }, requestUrl, "fetch");
            } catch {}

            const responsePromise = originalFetch.apply(this, arguments);
            try {
                Promise.resolve(responsePromise)
                    .then((response) => inspectFetchResponse(response, requestUrl, "fetch-response"))
                    .catch(() => {});
            } catch {}
            return responsePromise;
        };
    }

    const OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR?.prototype) {
        const originalOpen = OriginalXHR.prototype.open;
        const originalSetRequestHeader = OriginalXHR.prototype.setRequestHeader;
        const originalSend = OriginalXHR.prototype.send;

        OriginalXHR.prototype.open = function ilovXhrOpen(method, url) {
            try {
                this.__ilovRequestUrl = requestUrlFrom(url);
            } catch {}
            return originalOpen.apply(this, arguments);
        };

        OriginalXHR.prototype.setRequestHeader = function ilovXhrSetRequestHeader(name, value) {
            try {
                this.__ilovHeadersContext = {
                    ...(this.__ilovHeadersContext || {}),
                    ...contextFromHeaders({
                        [name]: value
                    })
                };
            } catch {}
            return originalSetRequestHeader.apply(this, arguments);
        };

        OriginalXHR.prototype.send = function ilovXhrSend(body) {
            try {
                emitContext({
                    ...(this.__ilovHeadersContext || {}),
                    ...contextFromBody(body)
                }, this.__ilovRequestUrl || "", "xhr");
            } catch {}
            try {
                this.addEventListener("load", () => inspectXhrResponse(this, this.__ilovRequestUrl || "", "xhr-response"), {
                    once: true
                });
            } catch {}
            return originalSend.apply(this, arguments);
        };
    }
})();