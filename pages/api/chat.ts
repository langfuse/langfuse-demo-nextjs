import { NextApiRequest, NextApiResponse } from 'next';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody } from '@/types/chat';

// import { LangfuseClient } from '@finto-fern/api-client';
// import { TraceStatus } from '@finto-fern/api-client/api';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { model, messages, key, prompt, temperature } = req.body as ChatBody;

    // const client = new LangfuseClient({
    //   environment: 'http://localhost:3000',
    //   username: 'pk-lf-...d0b',
    //   password: 'sk-lf-...2f3'
    // });

    // const trace = await client.trace.create({
    //   name: 'chat-completion',
    //   attributes: { env: 'http://localhost:3030' },
    //   status: TraceStatus.Executing
    // })

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
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
    //   traceId: trace.id,
    //   startTime: new Date(),
    //   name: 'chat-completion',
    //   attributes: {
    //     model: {
    //       modelId: model.id,
    //       modelName: model.name,
    //     },
    //     prompt: JSON.stringify([
    //       {
    //         role: 'system',
    //         content: promptToSend,
    //       },
    //       ...messagesToSend,
    //     ],),
    //   },
    // })

    const stream = await OpenAIStream(
      model,
      promptToSend,
      temperatureToUse,
      key,
      messagesToSend,
    );

    const reader = stream.getReader();

    let completeResp = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      completeResp += new TextDecoder().decode(value);
    }

    // await client.span.updateLlmCall({
    //   spanId: llmCall.id,
    //   endTime: new Date(),
    //   attributes: {
    //     completion: completeResp,
    //   },
    // });

    // await client.trace.update({
    //   id: trace.id,
    //   status: TraceStatus.Success,
    // })

    res.status(200).json({
      response: completeResp,
      // traceId: trace.id
    });
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
