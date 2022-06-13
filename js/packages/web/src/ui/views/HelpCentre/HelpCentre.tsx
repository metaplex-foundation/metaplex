import React, { FC, useState } from 'react'
import CN from 'classnames'
import { SectionHeading, Accordion, TextField, TextArea, Button } from '@oyster/common'
import { inquire } from '../../../api'


export interface HelpCentreProps {
  [x: string]: any
}

export const HelpCentre: FC<HelpCentreProps> = ({ className, ...restProps }: HelpCentreProps) => {
  const HelpCentreClasses = CN(`help-centre w-full`, className)

  const [email, setEmail] = useState<any>(null)
  const [message, setMessage] = useState<any>(null)

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const inqureEmail = async () => {
    try {
      console.log(email, message)

      if(validateEmail(email)){
        await inquire({
          email: email,
          message: message
        })
  
        alert("Thank you for getting in touch! We appreciate you contacting us at Karmaverse. One of our colleagues will get back in touch with you soon!");
  
        setEmail("")
        setMessage("")
      }else{
        alert("please enter correct email.");
      }


    } catch (error) {
      console.error(error)
    } 
  }

  return (
    <div className={HelpCentreClasses} {...restProps}>
      <div className='container py-[80px]'>
        <SectionHeading
          commonClassName='!flex items-center !justify-center !text-center w-full'
          headingClassName='text-display-md'
          heading='Help Centre'
          description='Browse through our answers for the frequently asked questions or <br/>
          get answers for your specific question.'
          descriptionClassName='!text-slate-700'
        />
      </div>

      {/* FAQ */}
      <div className='container rounded-[12px] border border-N-200 bg-white px-[40px] pt-[40px] pb-[60px] shadow-card-light'>
        <h5 className='text-h5 font-500 text-black'>Frequently asked questions</h5>

        <div className='flex flex-col gap-[12px] pt-[40px]'>
          <Accordion
            heading='What is an NFT?'
            body='Vestibulum varius tincidunt eleifend. Donec rutrum tempus erat hendrerit fringilla. Duis
            ornare, quam vitae pellentesque lacinia, erat justo vulputate elit, viverra finibus erat
            lectus quis sem. Pellentesque eget diam suscipit, venenatis mi at, ullamcorper purus.
            Vivamus egestas, lectus vel viverra elementum, purus sapien vestibulum nulla, vel maximus
            sapien mi sit amet tellus.
            <br /> <br />
            Fusce at justo sed nunc euismod gravida vitae non nisl. Donec eu velit placerat, placerat
            nulla eu, ultricies purus. Phasellus eleifend leo eget turpis fringilla, vitae mattis odio
            tempor. Etiam commodo nisi dui, et porttitor nulla varius in.'
          />
          <Accordion
            heading='What is Karmaverse?'
            body='Vestibulum varius tincidunt eleifend. Donec rutrum tempus erat hendrerit fringilla. Duis
            ornare, quam vitae pellentesque lacinia, erat justo vulputate elit, viverra finibus erat
            lectus quis sem. Pellentesque eget diam suscipit, venenatis mi at, ullamcorper purus.
            Vivamus egestas, lectus vel viverra elementum, purus sapien vestibulum nulla, vel maximus
            sapien mi sit amet tellus.
            <br /> <br />
            Fusce at justo sed nunc euismod gravida vitae non nisl. Donec eu velit placerat, placerat
            nulla eu, ultricies purus. Phasellus eleifend leo eget turpis fringilla, vitae mattis odio
            tempor. Etiam commodo nisi dui, et porttitor nulla varius in.'
          />
          <Accordion
            heading='What is an NFT?'
            body='Vestibulum varius tincidunt eleifend. Donec rutrum tempus erat hendrerit fringilla. Duis
            ornare, quam vitae pellentesque lacinia, erat justo vulputate elit, viverra finibus erat
            lectus quis sem. Pellentesque eget diam suscipit, venenatis mi at, ullamcorper purus.
            Vivamus egestas, lectus vel viverra elementum, purus sapien vestibulum nulla, vel maximus
            sapien mi sit amet tellus.
            <br /> <br />
            Fusce at justo sed nunc euismod gravida vitae non nisl. Donec eu velit placerat, placerat
            nulla eu, ultricies purus. Phasellus eleifend leo eget turpis fringilla, vitae mattis odio
            tempor. Etiam commodo nisi dui, et porttitor nulla varius in.'
          />
          <Accordion
            heading='What is blockchain?'
            body='Vestibulum varius tincidunt eleifend. Donec rutrum tempus erat hendrerit fringilla. Duis
            ornare, quam vitae pellentesque lacinia, erat justo vulputate elit, viverra finibus erat
            lectus quis sem. Pellentesque eget diam suscipit, venenatis mi at, ullamcorper purus.
            Vivamus egestas, lectus vel viverra elementum, purus sapien vestibulum nulla, vel maximus
            sapien mi sit amet tellus.
            <br /> <br />
            Fusce at justo sed nunc euismod gravida vitae non nisl. Donec eu velit placerat, placerat
            nulla eu, ultricies purus. Phasellus eleifend leo eget turpis fringilla, vitae mattis odio
            tempor. Etiam commodo nisi dui, et porttitor nulla varius in.'
          />
          <Accordion
            heading='Why Solana?'
            body='Vestibulum varius tincidunt eleifend. Donec rutrum tempus erat hendrerit fringilla. Duis
            ornare, quam vitae pellentesque lacinia, erat justo vulputate elit, viverra finibus erat
            lectus quis sem. Pellentesque eget diam suscipit, venenatis mi at, ullamcorper purus.
            Vivamus egestas, lectus vel viverra elementum, purus sapien vestibulum nulla, vel maximus
            sapien mi sit amet tellus.
            <br /> <br />
            Fusce at justo sed nunc euismod gravida vitae non nisl. Donec eu velit placerat, placerat
            nulla eu, ultricies purus. Phasellus eleifend leo eget turpis fringilla, vitae mattis odio
            tempor. Etiam commodo nisi dui, et porttitor nulla varius in.'
          />
          <Accordion
            heading='How do I prevent getting scammed?'
            body='Vestibulum varius tincidunt eleifend. Donec rutrum tempus erat hendrerit fringilla. Duis
            ornare, quam vitae pellentesque lacinia, erat justo vulputate elit, viverra finibus erat
            lectus quis sem. Pellentesque eget diam suscipit, venenatis mi at, ullamcorper purus.
            Vivamus egestas, lectus vel viverra elementum, purus sapien vestibulum nulla, vel maximus
            sapien mi sit amet tellus.
            <br /> <br />
            Fusce at justo sed nunc euismod gravida vitae non nisl. Donec eu velit placerat, placerat
            nulla eu, ultricies purus. Phasellus eleifend leo eget turpis fringilla, vitae mattis odio
            tempor. Etiam commodo nisi dui, et porttitor nulla varius in.'
          />
          <Accordion
            heading='Are there risks involved in NFTs?'
            body='Vestibulum varius tincidunt eleifend. Donec rutrum tempus erat hendrerit fringilla. Duis
            ornare, quam vitae pellentesque lacinia, erat justo vulputate elit, viverra finibus erat
            lectus quis sem. Pellentesque eget diam suscipit, venenatis mi at, ullamcorper purus.
            Vivamus egestas, lectus vel viverra elementum, purus sapien vestibulum nulla, vel maximus
            sapien mi sit amet tellus.
            <br /> <br />
            Fusce at justo sed nunc euismod gravida vitae non nisl. Donec eu velit placerat, placerat
            nulla eu, ultricies purus. Phasellus eleifend leo eget turpis fringilla, vitae mattis odio
            tempor. Etiam commodo nisi dui, et porttitor nulla varius in.'
          />
          <Accordion
            heading='Are these bad for the environment?'
            body='Vestibulum varius tincidunt eleifend. Donec rutrum tempus erat hendrerit fringilla. Duis
            ornare, quam vitae pellentesque lacinia, erat justo vulputate elit, viverra finibus erat
            lectus quis sem. Pellentesque eget diam suscipit, venenatis mi at, ullamcorper purus.
            Vivamus egestas, lectus vel viverra elementum, purus sapien vestibulum nulla, vel maximus
            sapien mi sit amet tellus.
            <br /> <br />
            Fusce at justo sed nunc euismod gravida vitae non nisl. Donec eu velit placerat, placerat
            nulla eu, ultricies purus. Phasellus eleifend leo eget turpis fringilla, vitae mattis odio
            tempor. Etiam commodo nisi dui, et porttitor nulla varius in.'
          />
        </div>
      </div>

      {/* Email support */}
      <div className='container pt-[40px] pb-[100px]'>
        <div className='rounded-[12px] border border-N-200 bg-white px-[40px] pt-[40px] pb-[60px] shadow-card-light'>
          <div className='flex flex-col gap-[12px]'>
            <h5 className='text-h5 font-500 text-black'>
              Didn’t find the answer you are looking for?
            </h5>
            <p className='text-base font-400 text-black'>
              Our support will be happy to assist you via Email
            </p>
          </div>

          <div className='flex flex-col gap-[20px] pt-[40px]'>
            <TextField label='Your email address' placeHolder='ex. john@example.com' value={email} onChange={e => setEmail(e.target.value)} />
            <TextArea label='Message' placeHolder='Please enter your question in detail...' value={message} onChange={e => setMessage(e.target.value)} />
          </div>

          <div className='pt-[40px]'>
            <Button isRounded={false} className='w-[300px] rounded-[8px]' size='lg' onClick={inqureEmail}>
              Submit Question
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpCentre
