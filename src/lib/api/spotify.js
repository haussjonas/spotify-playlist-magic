import axios from "axios";
import Future from "fluture";
import { isEmpty, isNil } from "ramda";

const client = axios.create({
  baseURL: "https://api.spotify.com/v1"
});

const fetch = options =>
  Future((reject, resolve) => {
    client(options)
      .then(response => resolve(response.data))
      .catch(reject);
  });

export const setAuthorization = token => {
  client.defaults.headers.common["Authorization"] =
    isEmpty(token) || isNil(token) ? "" : `Bearer ${token}`;
};

export default fetch;
