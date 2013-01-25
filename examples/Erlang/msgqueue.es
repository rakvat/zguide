#!/usr/bin/env escript
%%
%% Simple message queuing broker
%% Same as request-reply broker but using QUEUE device
%%

main(_) ->
    {ok, Context} = erlzmq:context(),

    %% Socket facing clients
    {ok, Frontend} = erlzmq:socket(Context, router),
    ok = erlzmq:bind(Frontend, "tcp://*:5559"),

    %% Socket facing services
    {ok, Backend} = erlzmq:socket(Context, dealer),
    ok = erlzmq:bind(Backend, "tcp://*:5560"),

    %% Start built-in device
    erlzmq_proxy:create(Frontend, Backend),

    %% We never get here...
    ok = erlzmq:close(Frontend),
    ok = erlzmq:close(Backend),
    ok = erlzmq:term(Context).
