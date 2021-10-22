import {Schema, model} from 'mongoose';

interface Sample {
    name: string,
    surname: string
};

const sampleSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: true
    }
});

const SampleModel = model<Sample>('Sample', sampleSchema);

export {SampleModel}

