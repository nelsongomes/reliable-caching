import { Map } from "immutable";

const map = Map({ a: 1, b: 2 });

map.set("a", 3);
console.log(JSON.stringify(map));
