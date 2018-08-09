import { main } from "./main";

main()
.then()
.catch(err => {
  if (err instanceof Error) {
    console.error(err.message);
    console.error(err.stack);
  } else {
    console.error(err);
  }
  process.exit(1);
});
;
