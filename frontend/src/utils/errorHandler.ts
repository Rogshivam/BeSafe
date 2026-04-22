// Production-ready error handling and user feedback system
export interface ErrorInfo {
  message: string;
  type: 'network' | 'server' | 'validation' | 'rate_limit' | 'timeout' | 'unknown';
  statusCode?: number;
  retryable: boolean;
  userMessage: string;
  suggestedAction?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCallbacks: ((error: ErrorInfo) => void)[] = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Register callback for error notifications
   */
  public onError(callback: (error: ErrorInfo) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Remove error callback
   */
  public removeErrorCallback(callback: (error: ErrorInfo) => void): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all error callbacks
   */
  private notifyError(error: ErrorInfo): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }

  /**
   * Parse and categorize errors from fetch/axios responses
   */
  public parseError(error: any): ErrorInfo {
    // Network errors
    if (error.name === 'TypeError' || error.code === 'NETWORK_ERROR') {
      return {
        message: error.message || 'Network error occurred',
        type: 'network',
        retryable: true,
        userMessage: 'Network connection issue. Please check your internet connection.',
        suggestedAction: 'Try refreshing the page or check your internet connection.'
      };
    }

    // Rate limiting errors
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'] || 
                        error.response.data?.retryAfter || 
                        60; // Default to 60 seconds
      
      return {
        message: 'Rate limit exceeded',
        type: 'rate_limit',
        statusCode: 429,
        retryable: true,
        userMessage: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
        suggestedAction: `Please wait ${retryAfter} seconds before making another request.`
      };
    }

    // Server errors (5xx)
    if (error.response?.status >= 500) {
      return {
        message: error.response.data?.message || 'Server error occurred',
        type: 'server',
        statusCode: error.response.status,
        retryable: true,
        userMessage: 'Server is experiencing issues. Please try again.',
        suggestedAction: 'The server is temporarily unavailable. Please try again in a few moments.'
      };
    }

    // Validation errors (4xx except 429)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      const validationErrors = error.response.data?.errors;
      
      return {
        message: error.response.data?.message || 'Request validation failed',
        type: 'validation',
        statusCode: error.response.status,
        retryable: false,
        userMessage: validationErrors ? 
          validationErrors.map((e: any) => e.message).join(', ') :
          'Invalid request. Please check your input.',
        suggestedAction: 'Please correct the highlighted errors and try again.'
      };
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        message: 'Request timed out',
        type: 'timeout',
        retryable: true,
        userMessage: 'Request took too long. Please try again.',
        suggestedAction: 'The request timed out. Please try again with a better connection.'
      };
    }

    // Unknown errors
    return {
      message: error.message || 'An unknown error occurred',
      type: 'unknown',
      retryable: true,
      userMessage: 'An unexpected error occurred. Please try again.',
      suggestedAction: 'Something went wrong. Please refresh the page and try again.'
    };
  }

  /**
   * Handle error with logging and user notification
   */
  public handleError(error: any, context?: string): ErrorInfo {
    const errorInfo = this.parseError(error);
    
    // Log error for debugging
    console.error(`Error${context ? ` in ${context}` : ''}:`, {
      ...errorInfo,
      originalError: error
    });

    // Notify error callbacks
    this.notifyError(errorInfo);

    return errorInfo;
  }

  /**
   * Check if error is retryable
   */
  public isRetryable(error: any): boolean {
    const errorInfo = this.parseError(error);
    return errorInfo.retryable;
  }

  /**
   * Get user-friendly error message
   */
  public getUserMessage(error: any): string {
    const errorInfo = this.parseError(error);
    return errorInfo.userMessage;
  }

  /**
   * Get suggested action for error
   */
  public getSuggestedAction(error: any): string | undefined {
    const errorInfo = this.parseError(error);
    return errorInfo.suggestedAction;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions
export const handleError = (error: any, context?: string) => 
  errorHandler.handleError(error, context);

export const isRetryable = (error: any) => 
  errorHandler.isRetryable(error);

export const getUserMessage = (error: any) => 
  errorHandler.getUserMessage(error);

export const getSuggestedAction = (error: any) => 
  errorHandler.getSuggestedAction(error);
