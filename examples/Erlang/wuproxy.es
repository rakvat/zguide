#! /usr/bin/env escript
%%
%% Weather proxy device
%%

main(_) ->
    {ok, Context} = erlzmq:context(),

    %% This is where the weather server sits
    {ok, Frontend} = erlzmq:socket(Context, xsub),
    ok = erlzmq:connect(Frontend, "tcp://localhost:5556"),

    %% This is our public endpoint for subscribers
    {ok, Backend} = erlzmq:socket(Context, xpub),
    ok = erlzmq:bind(Backend, "tcp://*:8100"),

    erlzmq_proxy:create(Frontend, Backend),

    %% We don't actually get here but if we did, we'd shut down neatly
    ok = erlzmq:close(Frontend),
    ok = erlzmq:close(Backend),
    ok = erlzmq:term(Context).

