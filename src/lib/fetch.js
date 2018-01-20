import { encaseP2, tryP } from "fluture";
const taskifiedFetch = encaseP2(fetch);

export default (url, options) =>
  taskifiedFetch(url, options).chain(response => tryP(_ => response.json()));
