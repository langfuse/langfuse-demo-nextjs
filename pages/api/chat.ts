import { NextApiRequest, NextApiResponse } from 'next';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError } from '@/utils/server';

import { ChatBody } from '@/types/chat';
import { Configuration, OpenAIApi } from 'openai';
import { LangfuseClient } from '@finto-fern/langfuse-node';
import { isAxiosError } from 'axios';


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { model, messages, key, prompt, temperature } = req.body as ChatBody;

    const client = new LangfuseClient({
      environment: 'http://localhost:3000',
      username: process.env.PUBLISHABLE_KEY!, // 'pk-lf-...43d',
      password: process.env.SECRET_KEY!, //'sk-lf-...959'
    });

    // const trace = await client.trace.create({
    //   name: 'chat-completion',
    //   attributes: { env: 'http://localhost:3030' },
    // })

    let systemPrompt = prompt;
    if (!systemPrompt) {
      systemPrompt = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const messagesToSend = messages.map((message) => {
      return {
        role: message.role,
        content: message.content,
      };
    });

    // const llmCall = await client.span.createLlmCall({
    //   // traceId: trace.id, //optional
    //   startTime: new Date(),
    //   name: 'chat-completion',
    //   attributes: {
    //     model: model.id,
    //     temperature: temperatureToUse,
    //     maxTokens: 2000,
    //     topP: undefined,
    //     prompt: [
    //       {
    //         role: 'system',
    //         content: systemPrompt,
    //       },
    //       ...messagesToSend,
    //     ],
    //   },
    // })

    const configuration = new Configuration({
      apiKey: key,
    });
    const openai = new OpenAIApi(configuration);
    
    const chatCompletion = await openai.createChatCompletion({
      model: model.id,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messagesToSend,
      ],
      max_tokens: 2000,
      temperature: temperature,
      stream: false,
    })
    
    // await client.span.updateLlmCall({
    //   spanId: llmCall.id,
    //   endTime: new Date(),
    //   attributes: {
    //     completion: chatCompletion.data.choices[0].message?.content,
    //     tokens: {
    //       promptAmount: chatCompletion.data.usage?.prompt_tokens,
    //       completionAmount: chatCompletion.data.usage?.completion_tokens,
    //     }
    //   },
    // });

    res.status(200).json({
      response: chatCompletion.data.choices[0].message?.content,
      // traceId: trace.id
    });
  } catch (error) {

    isAxiosError(error)
      ? console.log('error sending error response: ', error.message, error.response?.data)
      : console.log('error sending error response: ', error); 


    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message }); 
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
