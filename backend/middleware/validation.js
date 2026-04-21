import { body, validationResult } from 'express-validator';

const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phone')
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
 body('userType')
  .isIn(['Individual', 'Member', 'Parent', 'Child'])
  .withMessage('User type must be Individual, Member, Parent, or Child'),

  body('age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateEmergencyContact = [
  body('memberId')
    .isMongoId()
    .withMessage('Valid member ID is required'),
  
  body('relation')
    .isIn(['Parent', 'Friend', 'Guardian', 'Spouse', 'Sibling', 'Other'])
    .withMessage('Invalid relation type'),
  
  body('priority')
    .isIn(['High', 'Medium', 'Low'])
    .withMessage('Priority must be High, Medium, or Low')
];

const validateLocation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive number')
];

const validateEmergency = [
  body('triggeredBy')
    .isIn(['Manual', 'Voice', 'Gesture', 'Auto', 'Location'])
    .withMessage('Invalid trigger type'),
  
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('severity')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid severity level'),
  
  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
];

const validateMessage = [
  body('receiverId')
    .isMongoId()
    .withMessage('Valid receiver ID is required'),
  
  body('messageType')
    .optional()
    .isIn(['Text', 'Image', 'Audio', 'Location', 'System'])
    .withMessage('Invalid message type'),
  
  body('content')
    .if(body('messageType').equals('Text'))
    .notEmpty()
    .withMessage('Message content is required for text messages')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
  
  body('priority')
    .optional()
    .isIn(['Low', 'Normal', 'High', 'Urgent'])
    .withMessage('Invalid priority level')
];

const validateRelationshipRequest = [
  body('targetUserId')
    .notEmpty()
    .withMessage('Target user ID is required'),
  body('relationshipType')
    .isIn(['parent-child', 'guardian-ward', 'guardian-adult','adult-adult'])
    .withMessage('Invalid relationship type'),
  body('requestMessage')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Request message must be less than 500 characters'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  body('permissions.locationTracking')
    .optional()
    .isBoolean()
    .withMessage('Location tracking permission must be boolean'),
  body('permissions.emergencyAlerts')
    .optional()
    .isBoolean()
    .withMessage('Emergency alerts permission must be boolean'),
  body('permissions.communication')
    .optional()
    .isBoolean()
    .withMessage('Communication permission must be boolean'),
  body('permissions.manageSettings')
    .optional()
    .isBoolean()
    .withMessage('Manage settings permission must be boolean'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  
  next();
};

export {
  validateRegister,
  validateLogin,
  validateEmergencyContact,
  validateLocation,
  validateEmergency,
  validateMessage,
  validateRelationshipRequest,
  handleValidationErrors
};
