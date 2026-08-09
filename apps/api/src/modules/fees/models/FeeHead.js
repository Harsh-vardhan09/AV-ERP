const mongoose = require('mongoose');

const feeHeadSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Fee head name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name must not exceed 100 characters'],
        },
        category: {
            type: String,
            enum: {
                values: ['one-time', 'monthly', 'yearly', 'optional'],
                message: 'Category must be one-time, monthly, yearly, or optional',
            },
            required: [true, 'Category is required'],
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description must not exceed 500 characters'],
        },

        // Multi-tenancy
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

feeHeadSchema.index({ createdAt: -1 });
feeHeadSchema.index({ category: 1, isActive: 1 });
// Name unique within a school
feeHeadSchema.index({ name: 1, schoolId: 1 }, { unique: true });

feeHeadSchema.virtual('status').get(function () {
    return this.isActive ? 'active' : 'inactive';
});

module.exports = mongoose.model('FeeHead', feeHeadSchema);
