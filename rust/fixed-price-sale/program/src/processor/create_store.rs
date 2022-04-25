use crate::{error::ErrorCode, utils::*, CreateStore};
use anchor_lang::prelude::*;

impl<'info> CreateStore<'info> {
    pub fn process(&mut self, name: String, description: String) -> Result<()> {
        let admin = &self.admin;
        let store = &mut self.store;

        if name.len() > NAME_MAX_LEN {
            return Err(ErrorCode::NameIsTooLong.into());
        }

        if description.len() > DESCRIPTION_MAX_LEN {
            return Err(ErrorCode::DescriptionIsTooLong.into());
        }

        store.admin = admin.key();
        store.name = puffed_out_string(name, NAME_MAX_LEN);
        store.description = puffed_out_string(description, DESCRIPTION_MAX_LEN);

        Ok(())
    }
}
