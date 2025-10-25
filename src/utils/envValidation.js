/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are set on app startup.
 * Helps catch configuration errors early.
 * 
 * @module utils/envValidation
 */

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

/**
 * Optional environment variables with warnings if not set
 */
const OPTIONAL_ENV_VARS = [
  'VITE_STRIPE_PUBLIC_KEY',
  'VITE_APP_URL',
];

/**
 * Validate that all required environment variables are set
 * 
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export const validateEnvironmentVariables = () => {
  const errors = [];
  const warnings = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = import.meta.env[varName];
    
    if (!value || value.trim() === '') {
      errors.push(`Required environment variable ${varName} is not set`);
    } else if (value === 'undefined' || value === 'null') {
      errors.push(`Environment variable ${varName} is set to "${value}" which is invalid`);
    }
  }

  // Check optional variables
  for (const varName of OPTIONAL_ENV_VARS) {
    const value = import.meta.env[varName];
    
    if (!value || value.trim() === '') {
      warnings.push(`Optional environment variable ${varName} is not set - some features may not work`);
    }
  }

  // Validate Supabase URL format
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must start with https://');
  }

  // Validate Stripe key format (if provided)
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (stripeKey && !stripeKey.startsWith('pk_')) {
    errors.push('VITE_STRIPE_PUBLIC_KEY must start with pk_ (public key)');
  }

  // Validate environment mode
  const mode = import.meta.env.MODE;
  const validModes = ['development', 'production', 'test'];
  if (mode && !validModes.includes(mode)) {
    warnings.push(`Unknown environment MODE "${mode}". Expected: ${validModes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mode: import.meta.env.MODE || 'unknown',
  };
};

/**
 * Get environment information
 * 
 * @returns {Object} Environment information
 */
export const getEnvironmentInfo = () => {
  return {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    baseUrl: import.meta.env.BASE_URL,
    hasSupabase: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    hasStripe: !!import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  };
};

/**
 * Initialize environment validation on app startup
 * 
 * Logs errors and warnings to console
 * Throws error in production if required vars are missing
 */
export const initializeEnvironmentValidation = () => {
  const validation = validateEnvironmentVariables();
  const env = getEnvironmentInfo();

  console.log('🔧 Environment Mode:', env.mode);
  console.log('🔧 Has Supabase Config:', env.hasSupabase);
  console.log('🔧 Has Stripe Config:', env.hasStripe);

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Environment Warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (!validation.isValid) {
    console.error('❌ Environment Variable Errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));

    if (env.prod) {
      // In production, throw error to prevent app from starting with missing config
      throw new Error('Missing required environment variables. Check console for details.');
    } else {
      // In development, log error but allow app to continue
      console.error('⚠️  App may not function correctly. Please check your .env file.');
    }
  } else {
    console.log('✅ Environment validation passed');
  }

  return validation;
};

/**
 * Check if specific feature is enabled via environment
 * 
 * @param {string} feature - Feature name to check
 * @returns {boolean} True if feature is enabled
 */
export const isFeatureEnabled = (feature) => {
  const featureVarName = `VITE_FEATURE_${feature.toUpperCase()}`;
  const value = import.meta.env[featureVarName];
  
  return value === 'true' || value === '1' || value === 'enabled';
};

export default {
  validateEnvironmentVariables,
  getEnvironmentInfo,
  initializeEnvironmentValidation,
  isFeatureEnabled,
};

