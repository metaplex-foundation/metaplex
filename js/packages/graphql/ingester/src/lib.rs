use {neon::prelude::*, solana_program::pubkey::Pubkey, std::str::FromStr};

fn to_vec(cx: &mut FunctionContext, list: &Handle<JsValue>) -> NeonResult<Vec<String>> {
    if list.is_a::<JsArray, _>(cx) {
        let list = list.downcast::<JsArray, _>(cx).unwrap();
        let len = list.len(cx) as usize;
        let mut result: Vec<String> = Vec::with_capacity(len);
        for index in 0..len {
            let item = list.get(cx, index as u32)?;
            let item = item.to_string(cx)?;
            let item = item.value(cx);
            result.insert(index, item);
        }
        return Ok(result);
    } else if list.is_a::<JsString, _>(cx) {
        let item = list.downcast::<JsString, _>(cx).unwrap().value(cx);
        let result = vec![item];
        return Ok(result);
    } else {
        return Ok(vec![]);
    }
}

trait Finder {
    fn try_find_address(
        &self,
        program_id: &Pubkey,
        a1: &String,
        a2: &String,
        a3: &String,
        a4: &String,
    ) -> Option<(Pubkey, u8)>;
}

struct FinderPubKey;
impl Finder for FinderPubKey {
    fn try_find_address(
        &self,
        program_id: &Pubkey,
        a1: &String,
        a2: &String,
        a3: &String,
        a4: &String,
    ) -> Option<(Pubkey, u8)> {
        let s2 = Pubkey::from_str(&a2[..]).unwrap();
        let s3 = Pubkey::from_str(&a3[..]).unwrap();
        let s4 = Pubkey::from_str(&a4[..]).unwrap();
        let seeds = [a1.as_bytes(), s2.as_ref(), s3.as_ref(), s4.as_ref()];
        Pubkey::try_find_program_address(&seeds, &program_id)
    }
}

struct FinderLastBuf;
impl Finder for FinderLastBuf {
    fn try_find_address(
        &self,
        program_id: &Pubkey,
        a1: &String,
        a2: &String,
        a3: &String,
        a4: &String,
    ) -> Option<(Pubkey, u8)> {
        println!("XXX {} {} {} {}", a1, a2, a3, a4);
        let s2 = Pubkey::from_str(&a2[..]).unwrap();
        let s3 = Pubkey::from_str(&a3[..]).unwrap();
        let seeds = [a1.as_bytes(), s2.as_ref(), s3.as_ref(), a4.as_bytes()];
        Pubkey::try_find_program_address(&seeds, &program_id)
    }
}

fn get_finder(mode: &str) -> Option<Box<dyn Finder>> {
    match mode {
        "FinderPubKey" => Some(Box::new(FinderPubKey {})),
        "FinderLastBuf" => Some(Box::new(FinderLastBuf {})),
        _ => None,
    }
}

fn find_program_address(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let mode = cx.argument::<JsString>(0)?.value(&mut cx);

    let program_key = cx.argument::<JsString>(1)?.value(&mut cx);
    let block1 = cx.argument::<JsString>(2)?.value(&mut cx);
    let block2 = cx.argument::<JsString>(3)?.value(&mut cx);
    let blocks3 = cx.argument::<JsValue>(4)?;
    let blocks4 = cx.argument::<JsValue>(5)?;
    let program_id = Pubkey::from_str(&program_key[..]).unwrap();
    let cb_root = cx.argument::<JsFunction>(6)?.root(&mut cx);
    let channel = cx.channel();

    let blocks3 = to_vec(&mut cx, &blocks3)?;
    let blocks4 = to_vec(&mut cx, &blocks4)?;

    std::thread::spawn(move || {
        channel.send(move |mut cx| {
            let finder = get_finder(&mode[..]).unwrap();

            let callback = cb_root.into_inner(&mut cx);
            let null = cx.null();
            let block1_n = cx.string(&block1);
            let block2_n = cx.string(&block2);
            for block3 in &blocks3 {
                for block4 in &blocks4 {
                    let address =
                        finder.try_find_address(&program_id, &block1, &block2, block3, block4);

                    if let Some((key, _)) = address {
                        let key = key.to_string();
                        let key = cx.string(key);
                        let val3 = cx.string(block3);
                        let val4 = cx.string(block4);
                        callback.call(&mut cx, null, vec![key, block1_n, block2_n, val3, val4])?;
                    }
                }
            }
            callback.call(&mut cx, null, vec![null])?;
            Ok({})
        });
    });

    Ok(cx.undefined())
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("findProgramAddressList", find_program_address)?;
    Ok(())
}
