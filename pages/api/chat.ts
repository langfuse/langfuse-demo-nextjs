import { NextApiRequest, NextApiResponse } from 'next';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError } from '@/utils/server';

import { ChatBody } from '@/types/chat';
import { Configuration, OpenAIApi } from 'openai';
// import { LangfuseClient } from '@finto-fern/langfuse-node';
import { isAxiosError } from 'axios';


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { model, messages, key, prompt, temperature } = req.body as ChatBody;

    // const client = new LangfuseClient({
    //   environment: 'http://localhost:3000',
    //   username: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY!, // 'pk-lf-...43d',
    //   password: process.env.SECRET_KEY!, //'sk-lf-...959'
    // });

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

    // const trace = await client.trace.create({
    //   name: 'chat',
    //   metadata: {
    //     userId: 'user__935d7d1d-8625-4ef4-8651-544613e7bd22',
    //   },
    // });
    
    const startTimeUserSearch = new Date();

    //const dbUser = await client.users.get({ username: 'user__935d7d1d-8625-4ef4-8651-544613e7bd22' });

    // const userObservation = await client.span.create({
    //   startTime: startTimeUserSearch,
    //   endTime: new Date(),
    //   name: 'user-search',
    //   input: { 
    //     userId: 'user__935d7d1d-8625-4ef4-8651-544613e7bd22'
    //   },
    //   output: {
    //     firstName: 'Max', // dbUser.firstName
    //     lastName: 'Mustermann', // dbUser.lastName
    //     email: 'max.mustermann@gmail.com' // dbUser.email
    //   },
    //   metadata: {
    //     userId: 'user__935d7d1d-8625-4ef4-8651-544613e7bd22',
    //   },
    //   traceId: trace.id
    // });

    const configuration = new Configuration({
      apiKey: key,
    });
    const openai = new OpenAIApi(configuration);

    const startTime = new Date();
    
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

    // const generation = await client.generations.log({
    //   // traceId: trace.id, //<-- this is only required when nesting with userObservation
    //   startTime: startTime,
    //   endTime: new Date(),
    //   name: 'chat-completion',
    //   model: model.id,
    //   modelParameters: {
    //     temperature: temperatureToUse,
    //     maxTokens: 2000,
    //     topP: undefined,
    //   },
    //   prompt: [
    //     {
    //       role: 'system',
    //       content: systemPrompt,
    //     },
    //     ...messagesToSend,
    //   ],
    //   completion: chatCompletion.data.choices[0].message?.content,
    //   usage: {
    //     promptTokens: chatCompletion.data.usage?.prompt_tokens,
    //     completionTokens: chatCompletion.data.usage?.completion_tokens,
    //   },
    //   metadata: {
    //     userId: "user__935d7d1d-8625-4ef4-8651-544613e7bd22"
    //   },
    // })

    res.status(200).json({
      response: chatCompletion.data.choices[0].message?.content,
      // traceId: generation.traceId
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
