export default {
async fetch(): Promise<Response> {
return new Response(
JSON.stringify({
name: "WASSLHA API",
status: "ok",
environment: "development"
}),
{
headers: {
"Content-Type": "application/json"
}
}
);
}
};
