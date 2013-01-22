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

    %% TODO: use device to encapsulate xpub-xsub 

    %% Shunt messages out to our own subscribers
    %%  and handle subscriptions
    loop(Frontend, Backend),

    %% We don't actually get here but if we did, we'd shut down neatly
    ok = erlzmq:close(Frontend),
    ok = erlzmq:close(Backend),
    ok = erlzmq:term(Context).

loop(Frontend, Backend) ->
    %%  Pass the subscription upstream through the device.
    case erlzmq:recv(Backend, [dontwait]) of
        {error, eagain} -> ok;
        {ok, Buff0} ->
            ok = erlzmq:send(Frontend, Buff0)
    end,
    
    case erlzmq:recv(Frontend, [dontwait]) of
        {error, eagain} -> ok;
        {ok, Msg} ->
            case erlzmq:getsockopt(Frontend, rcvmore) of
                {ok, true} -> erlzmq:send(Backend, Msg, [sndmore]);
                {ok, false} -> erlzmq:send(Backend, Msg)
            end
    end,
    loop(Frontend, Backend).
