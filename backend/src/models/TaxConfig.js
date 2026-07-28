const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaxConfigSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    financialYear: {
      type: String,
      required: [true, 'Financial year is required'],
      trim: true,
      validate: {
        validator: function(v) {
          // Format check: YYYY-YY
          const regex = /^\d{4}-\d{2}$/;
          if (!regex.test(v)) return false;

          // Logical sequence check: 2025-26 is valid, 2025-27 is invalid
          const [startYear, endYearSuffix] = v.split('-').map(Number);
          const expectedEndSuffix = (startYear + 1) % 100;
          return endYearSuffix === expectedEndSuffix;
        },
        message: props => `${props.value} is not a valid financial year format (YYYY-YY) or sequence!`
      }
    },
    regime: {
      type: String,
      enum: ['old', 'new'],
      required: true,
    },
    taxSlabs: [
      {
        minIncome: {
          type: Number,
        },
        maxIncome: {
          type: Number,
        },
        taxRate: {
          type: Number,
        },
        surchargeRate: {
          type: Number,
        },
      },
    ],
    standardDeduction: {
      type: Number,
      required: true,
    },
    section80CLimit: {
      type: Number,
    },
    hraExemptionAllowed: {
      type: Boolean,
    },
    professionalTaxSlab: [
      {
        maxSalary: {
          type: Number,
        },
        monthlyTax: {
          type: Number,
        },
      },
    ],
    pfEmployerRate: {
      type: Number,
      required: true,
      default: 12,
    },
    pfEmployeeRate: {
      type: Number,
      required: true,
      default: 12,
    },
    esiEmployerRate: {
      type: Number,
      required: true,
      default: 3.25,
    },
    esiEmployeeRate: {
      type: Number,
      required: true,
      default: 0.75,
    },
    esiApplicableLimit: {
      type: Number,
      required: true,
      default: 21000,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique index — prevents duplicate active configs for same FY + regime per school
TaxConfigSchema.index({ schoolId: 1, financialYear: 1, regime: 1 }, { unique: true, sparse: false });

module.exports = mongoose.model('TaxConfig', TaxConfigSchema);
