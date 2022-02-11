import React, { FC } from 'react';
import { Quote } from '../../molecules/Quote';

export interface SampleKitchenSinkProps {
  [x: string]: any;
}

export const SampleKitchenSink: FC<SampleKitchenSinkProps> = () => {
  return (
    <>
      <p>
        As the SARS-CoV-2 pandemic continues with global cases nearing 2.5
        million, clinicians have raised questions about the accuracy of
        available COVID-19 tests. After in-house testing of different available
        tests, one physician found that Abbott’s assay using its ID NOW device,
        which can provide results in 5–13 minutes, has a false-negative rate
        that nears 15 percent. The full results, first reported by NPR, have not
        been published or peer-reviewed.
      </p>

      <h3>Header Level 3</h3>

      <ul>
        <li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li>
        <li>Aliquam tincidunt mauris eu risus.</li>
      </ul>

      <p>
        Gary Procop is the chairman of the commission of science, technology and
        policy for the American Society for Clinical Pathology, and is currently
        heading up COVID-19 testing at Cleveland Clinic. He and his team took
        239 patient samples known to be positive for the virus and re-tested
        them using five products available through the US Food and Drug
        Administration’s (FDA) emergency use authorization. The test that turned
        out to be the least accurate is the one known for its speed.
      </p>

      <p>
        The ID NOW machine was granted emergency use approval during the
        pandemic on March 27 and generated buzz after President Donald Trump
        unveiled it during a press conference. In Procop’s analysis, Abbott’s
        test had a false-negative rate of 14.8 percent.{' '}
      </p>

      <h2>Header Level 2</h2>

      <p>
        As the SARS-CoV-2 pandemic continues with global cases nearing 2.5
        million, clinicians have raised questions about the accuracy of
        available COVID-19 tests. After in-house testing of different available
        tests, one physician found that Abbott’s assay using its ID NOW device,
        which can provide results in 5–13 minutes, has a false-negative rate
        that nears 15 percent. The full results, first reported by NPR, have not
        been published or peer-reviewed.
      </p>

      <Quote
        quote="“So that means if you had 100 patients that were positive, 15 percent of those patients would be falsely called negative. They’d be told that they’re negative for COVID when they’re really positive. That’s not too good.”"
        author="Steve Mathews"
        className="not-prose my-[16px] md:my-[32px] lg:my-[48px]"
      />

      <p>
        The DiaSorin Simplexa test had a false-negative rate of around 11
        percent. Tests developed by the US Centers for Disease Control and
        Prevention, Cepheid, and Roche had false-negative rates of 0, 1.8, and
        3.5 percent, respectively. In the wake of the study’s results, Procop’s
        facility is no longer using the Abbott test, and he is not the only
        administrator to make that decision.
      </p>

      <h2>Header Level 2</h2>
      <p>
        The DiaSorin Simplexa test had a false-negative rate of around 11
        percent.
      </p>

      <p>
        Alan Wells, a pathologist at the University of Pittsburgh Medical
        Center, tells STAT that his facility is not using the test anymore
        because the viral load of the patient might play a role with testing
        accuracy, more readily identifying those with higher levels. “However,
        with lower loads of virus, a large fraction of these patients were not
        detected as positive,” he says. STAT also reports that Emily Miller, an
        OB-GYN at Northwestern University, referred to the test as “clinically
        not useful” to identify the virus in expectant mothers. According to
        NPR, Abbott disagrees with Procop’s findings, stating that any errors
        might come from the use of viral transport media, which is commonplace
        in testing and helps extend the shelf life of the sample. All of the
        samples in Procop’s study used this media rather than testing directly
        from the nasal swab. Abbott has sent letters to the healthcare
        facilities that have received some of the 600,000 tests, advising them
        to test directly with the swab, which yields the most reliable results.
      </p>

      <h3>Header Level 3</h3>

      <p>
        The DiaSorin Simplexa test had a false-negative rate of around 11
        percent. Tests developed by the US Centers for Disease Control and
        Prevention, Cepheid, and Roche had false-negative rates of 0, 1.8, and
        3.5 percent, respectively. In the wake of the study’s results, Procop’s
        facility is no longer using the Abbott test, and he is not the only
        administrator to make that decision.
      </p>

      <h3>Header Level 3</h3>

      <ul>
        <li>
          Morbi in sem quis dui placerat ornare. Pellentesque odio nisi, euismod
          in, pharetra a, ultricies in, diam. Sed arcu. Cras consequat.
        </li>
        <li>
          Praesent dapibus, neque id cursus faucibus, tortor neque egestas
          augue, eu vulputate magna eros eu erat. Aliquam erat volutpat. Nam dui
          mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus.
        </li>
        <li>
          Phasellus ultrices nulla quis nibh. Quisque a lectus. Donec
          consectetuer ligula vulputate sem tristique cursus. Nam nulla quam,
          gravida non, commodo a, sodales sit amet, nisi.
        </li>
        <li>
          Pellentesque fermentum dolor. Aliquam quam lectus, facilisis auctor,
          ultrices ut, elementum vulputate, nunc.
        </li>
      </ul>

      <p>
        <strong>Pellentesque habitant morbi tristique</strong> senectus et netus
        et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat
        vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet
        quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris
        placerat eleifend leo. Quisque sit amet est et sapien ullamcorper
        pharetra. Vestibulum erat wisi, condimentum sed,{' '}
        <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum,
        elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus
        lacus enim ac dui. <a href="#">Donec non enim</a> in turpis pulvinar
        facilisis. Ut felis.
      </p>

      <h4>Header Level 4</h4>

      <ol>
        <li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li>
        <li>Aliquam tincidunt mauris eu risus.</li>
      </ol>

      <p>
        Pellentesque habitant morbi tristique senectus et netus et malesuada
        fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae,
        ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam
        egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend
        leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum
        erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Aenean
        fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci,
        sagittis tempus lacus enim ac dui. Donec non enim in turpis pulvinar
        facilisis. Ut felis. Praesent dapibus, neque id cursus faucibus, tortor
        neque egestas augue, eu vulputate magna eros eu erat. Aliquam erat
        volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis
        luctus, metus
      </p>
    </>
  );
};

export default SampleKitchenSink;
