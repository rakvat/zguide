#! /usr/bin/env escript
%%
%% Custom routing Router to REQ
%%
%% While this example runs in a single process, that is just to make
%% it easier to start and stop the example. Each thread has its own
%% context and conceptually acts as a separate process.
%%

-define(NBR_WORKERS, 10).

worker_task() ->
    random:seed(now()),
    {ok, Context} = erlzmq:context(),
    {ok, Worker} = erlzmq:socket(Context, req),

    %% We use a string identity for ease here
    ok = erlzmq:setsockopt(Worker, identity, pid_to_list(self())),
    ok = erlzmq:connect(Worker, "tcp://localhost:5671"),

    Total = handle_tasks(Worker, 0),
    io:format("Completed ~b tasks~n", [Total]),

    erlzmq:close(Worker),
    erlzmq:term(Context).

handle_tasks(Worker, TaskCount) ->
    %% Tell the router we're ready for work
    ok = erlzmq:send(Worker, <<"Hi Boss">>), %%ready

    %% Get workload from router, until finished
    case erlzmq:recv(Worker) of
        {ok, <<"Fired!">>} -> TaskCount;
        {ok, _} ->
            %% Do some random work
            timer:sleep(random:uniform(500) + 1),
            handle_tasks(Worker, TaskCount + 1)
    end.

main(_) ->
    {ok, Context} = erlzmq:context(),
    {ok, Client} = erlzmq:socket(Context, router),
    ok = erlzmq:bind(Client, "tcp://*:5671"),

    start_workers(?NBR_WORKERS),
    %% stop work after 5 seconds
    erlang:send_after(5000, self(), no_more_work),
    route_work(Client),

    ok = erlzmq:close(Client),
    ok = erlzmq:term(Context).

start_workers(0) -> ok;
start_workers(N) when N > 0 ->
    spawn(fun() -> worker_task() end),
    start_workers(N - 1).

route_work(Client) ->
    receive
        no_more_work -> 
            stop_workers(Client, ?NBR_WORKERS)
    after     
        0 ->
            %% LRU worker is next waiting in queue
            {ok, Address} = erlzmq:recv(Client),
            {ok, <<>>} = erlzmq:recv(Client),  %%envelope delimiter
            {ok, <<"Hi Boss">>} = erlzmq:recv(Client), %%ready

            ok = erlzmq:send(Client, Address, [sndmore]),
            ok = erlzmq:send(Client, <<>>, [sndmore]), %%envelope delimiter
            ok = erlzmq:send(Client, <<"Work harder">>),
            route_work(Client)
    end.

stop_workers(_Client, 0) -> ok;
stop_workers(Client, N) ->
    %% Ask worker to shut down and report its results
    {ok, Address} = erlzmq:recv(Client),
    {ok, <<>>} = erlzmq:recv(Client),
    {ok, _Ready} = erlzmq:recv(Client),

    ok = erlzmq:send(Client, Address, [sndmore]),
    ok = erlzmq:send(Client, <<>>, [sndmore]),
    ok = erlzmq:send(Client, <<"Fired!">>),

    stop_workers(Client, N - 1).
