import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody } from '@/types/chat';
import { NextApiRequest, NextApiResponse } from 'next';
import { LangfuseClient, LangfuseEnvironment } from '@finto-fern/api-client';
import { Stream } from 'stream';

export const runtime = 'nodejs';
// This is required to enable streaming
export const dynamic = 'force-dynamic';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    
    const { model, messages, key, prompt, temperature } = (req.body) as ChatBody;
    
    const client = new LangfuseClient({
      environment: 'http://localhost:3000'

    });

    const trace = await client.trace.create({
      name: 'chat-completion',
      attributes: { env: LangfuseEnvironment.Local },
      status: 'executing'
    })
    
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

    const span = await client.span.createLlmCall({
      traceId: trace.id,
      startTime: new Date(),
      name: 'chat-completion',
      attributes: {
        model: {
          modelId: model.id,
          modelName: model.name,
        },
        prompt: promptToSend,
      },
    })    
   
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = stream.getReader();

    var completeResp = ''

    const read = async () => {
      const { done, value } = await reader.read();
      if (done) {

        await client.span.updateLlmCall({
          spanId: span.id,
          endTime: new Date(),
          attributes: {
            completion: completeResp,
          },
        });

        await client.trace.update({
          id: trace.id,
          status: 'success'
        })

        res.end();
        return;
      }


      completeResp = completeResp.concat(new TextDecoder().decode(value))
      console.log('write', new TextDecoder().decode(value));
      // Manually flush the data to the client by writing to the socket
      if (res.socket) {
        res.socket.write(value, () => {
          // Continue reading the next chunk once the current chunk is flushed
          read();
        });
      }
    };

    read();
    res.status(200);

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