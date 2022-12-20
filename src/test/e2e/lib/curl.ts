import { expect } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import * as fs from 'fs';
import request from 'supertest';

type PostParams = {
  url: string;
  basicAuth?: [string, string];
  bearerAuth?: string;
  headers?: { [k: string]: string };
  json?: Record<string, any>;
  form?: string;
  attachment?: {
    key: string;
    file: string;
    filename: string;
  };
  expectedStatus?: number;
};

type GetParams = {
  url: string;
  basicAuth?: [string, string];
  bearerAuth?: string;
  headers?: { [k: string]: string };
  expectedStatus?: number;
};

class Curler {
  app: INestApplication;

  constructor(app: INestApplication) {
    this.app = app;
  }

  async makeRequest(params: PostParams, base: request.Test): Promise<request.Response> {
    let req = base;

    if (params.json) {
      req = req.send(params.json);
    }

    if (params.form) {
      req = req.send(params.form);
    }

    if (params.headers) {
      req = req.set(params.headers);
    }

    if (params.basicAuth) {
      const [user, pass] = params.basicAuth;
      req = req.auth(user, pass);
    }

    if (params.bearerAuth) {
      req = req.set({ Authorization: `Bearer ${params.bearerAuth}` });
    }

    if (params.attachment) {
      const { key, filename, file } = params.attachment;
      req = req.attach(key, fs.readFileSync(file), filename);
    }

    const response = await req;

    if (response.status !== (params.expectedStatus || 200)) {
      console.error('Wrong status', response.status, response.body);
    }

    expect(response.status).toEqual(params.expectedStatus || 200);

    return response;
  }

  async post<T>(params: PostParams, f: (_: request.Response, __: any) => T): Promise<T> {
    const response = await this.makeRequest(
      params,
      request(this.app.getHttpServer()).post(params.url),
    );

    return f(response, response.body);
  }

  async put<T>(params: PostParams, f: (_: request.Response, __: any) => T): Promise<T> {
    const response = await this.makeRequest(
      params,
      request(this.app.getHttpServer()).put(params.url),
    );

    return f(response, response.body);
  }

  async delete<T>(params: GetParams, f: (_: request.Response, __: any) => T): Promise<T> {
    const response = await this.makeRequest(
      params,
      request(this.app.getHttpServer()).delete(params.url),
    );

    return f(response, response.body);
  }

  async get<T>(params: GetParams, f: (_: request.Response, __: any) => T): Promise<T> {
    const response = await this.makeRequest(
      params,
      request(this.app.getHttpServer()).get(params.url),
    );

    return f(response, response.body);
  }
}

export function curl(app: INestApplication) {
  return new Curler(app);
}
