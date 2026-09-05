export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export type VisitorContext = {
	ip: string | null;
	countryCode: string | null;
	regionCode: string | null;
	city: string | null;
	timezone: string | null;
	deviceType: DeviceType;
	os: string;
	browser: string;
	userAgent: string;
	referrer: string | null;
	language: string | null;
	asn: string | null;
	isBot: boolean;
	botScore: number;
	riskScore: number;
	riskReasons: string[];
};

export type RuleType =
	| 'country'
	| 'ip'
	| 'ip_range'
	| 'device'
	| 'os'
	| 'browser'
	| 'bot'
	| 'user_agent'
	| 'referrer'
	| 'asn';

export type RuleOperator =
	'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'matches' | 'cidr';

export type EvaluatedRule = {
	id: string;
	type: RuleType;
	operator: RuleOperator;
	action: 'block' | 'allow' | 'redirect';
	value: string;
	redirectUrl: string | null;
};

export type RuleDecision =
	{ matched: false } | { matched: true; action: EvaluatedRule['action']; rule: EvaluatedRule };

export type RotationCandidate = {
	id: string;
	weight: number;
	priority: number;
	position: number;
};
