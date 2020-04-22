import { ImmutableObject } from 'seamless-immutable';

export interface Config {
  osm: object;
}

export type IMConfig = ImmutableObject<Config>;
