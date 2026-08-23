export interface CuratorPresentationSnapshot {
	readonly locale: "en" | "zh-CN";
	readonly theme: "light" | "dark";
}

export interface CuratorPresentationRequest {
	readonly toolCallId: string;
	readonly surfaceId: string;
	readonly url: string;
	readonly title: string;
	readonly expiresAt: number;
}

export type CuratorPresentationResult =
	| { readonly kind: "presented"; readonly tabId: string }
	| { readonly kind: "recoverable-error"; readonly message: string }
	| { readonly kind: "fatal-error"; readonly message: string };

/** Product-owned presentation dependency. It never registers an Agent tool. */
export interface CuratorPresenter {
	readonly snapshot: () => Promise<CuratorPresentationSnapshot>;
	readonly present: (
		request: CuratorPresentationRequest,
	) => Promise<CuratorPresentationResult>;
	readonly settle: (input: {
		readonly toolCallId: string;
		readonly surfaceId: string;
		readonly preserveTab?: boolean;
	}) => Promise<void>;
}
