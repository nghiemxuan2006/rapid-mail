
import httpStatus from 'http-status';

class HTTP_ERROR extends Error {
    statusCode: number;
    errorCode: string;
    constructor(statusCode: number, message?: string) {
        super(message ?? httpStatus[statusCode]);
        this.statusCode = statusCode;
        this.errorCode = httpStatus[statusCode];
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BAD_REQUEST_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.BAD_REQUEST, message); }
}

export class UNAUTHORIZED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.UNAUTHORIZED, message); }
}

export class PAYMENT_REQUIRED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.PAYMENT_REQUIRED, message); }
}

export class FORBIDDEN_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.FORBIDDEN, message); }
}

export class NOT_FOUND_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.NOT_FOUND, message); }
}

export class METHOD_NOT_ALLOWED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.METHOD_NOT_ALLOWED, message); }
}

export class NOT_ACCEPTABLE_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.NOT_ACCEPTABLE, message); }
}

export class PROXY_AUTHENTICATION_REQUIRED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.PROXY_AUTHENTICATION_REQUIRED, message); }
}

export class REQUEST_TIMEOUT_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.REQUEST_TIMEOUT, message); }
}

export class CONFLICT_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.CONFLICT, message); }
}

export class GONE_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.GONE, message); }
}

export class LENGTH_REQUIRED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.LENGTH_REQUIRED, message); }
}

export class PRECONDITION_FAILED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.PRECONDITION_FAILED, message); }
}

export class UNSUPPORTED_MEDIA_TYPE_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.UNSUPPORTED_MEDIA_TYPE, message); }
}

export class EXPECTATION_FAILED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.EXPECTATION_FAILED, message); }
}

export class MISDIRECTED_REQUEST_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.MISDIRECTED_REQUEST, message); }
}

export class UNPROCESSABLE_ENTITY_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.UNPROCESSABLE_ENTITY, message); }
}

export class LOCKED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.LOCKED, message); }
}

export class FAILED_DEPENDENCY_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.FAILED_DEPENDENCY, message); }
}

export class TOO_EARLY_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.TOO_EARLY, message); }
}

export class UPGRADE_REQUIRED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.UPGRADE_REQUIRED, message); }
}

export class PRECONDITION_REQUIRED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.PRECONDITION_REQUIRED, message); }
}

export class TOO_MANY_REQUESTS_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.TOO_MANY_REQUESTS, message); }
}

export class REQUEST_HEADER_FIELDS_TOO_LARGE_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.REQUEST_HEADER_FIELDS_TOO_LARGE, message); }
}

export class UNAVAILABLE_FOR_LEGAL_REASONS_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.UNAVAILABLE_FOR_LEGAL_REASONS, message); }
}

export class INTERNAL_SERVER_ERROR_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.INTERNAL_SERVER_ERROR, message); }
}

export class NOT_IMPLEMENTED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.NOT_IMPLEMENTED, message); }
}

export class BAD_GATEWAY_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.BAD_GATEWAY, message); }
}

export class SERVICE_UNAVAILABLE_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.SERVICE_UNAVAILABLE, message); }
}

export class GATEWAY_TIMEOUT_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.GATEWAY_TIMEOUT, message); }
}

export class HTTP_VERSION_NOT_SUPPORTED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.HTTP_VERSION_NOT_SUPPORTED, message); }
}

export class INSUFFICIENT_STORAGE_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.INSUFFICIENT_STORAGE, message); }
}

export class LOOP_DETECTED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.LOOP_DETECTED, message); }
}

export class NOT_EXTENDED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.NOT_EXTENDED, message); }
}

export class NETWORK_AUTHENTICATION_REQUIRED_ERROR extends HTTP_ERROR {
    constructor(message?: string) { super(httpStatus.NETWORK_AUTHENTICATION_REQUIRED, message); }
}