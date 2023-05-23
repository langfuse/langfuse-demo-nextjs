import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { LangfuseClient, LangfuseEnvironment } from '@finto-fern/api-client';
import { NextApiRequest } from 'next';


const handler = async (req: NextApiRequest): Promise<Response> => {
  try {
    
    const { model, messages, key, prompt, temperature } = (req.body) as ChatBody;
    
    const client = new LangfuseClient({
      environment: LangfuseEnvironment.Local
    });

    // const trace = await client.trace.create({
    //   name: 'chat-completion',
    //   attributes: { env: LangfuseEnvironment.Local },
    //   status: 'executing'
    // })
    
    console.log("hello")

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    console.log(promptToSend)

    const stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messages);

    // await client.span.update({
    //   spanId: llmSpan.id,
    //   endTime: new Date(),
    // })

    console.log("response")

    return new Response(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
