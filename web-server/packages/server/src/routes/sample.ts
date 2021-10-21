import express, {Request, Response} from 'express';
import { SampleModel } from '../models/sample';

const router = express.Router();

router.get('/data', (req: Request, res: Response) => {
    const testObj = {
        name : "jackie",
        surname : "welles"
    }
    res.send(testObj);
})

router.post('/data', async (req: Request, res: Response) => {
    const {name, surname} = req.body;

    const doc = new SampleModel({name: "Jackie", surname: "Welles"});
    await doc.save();

    res.status(200).send(doc);
})


export {router as sampleRouter}