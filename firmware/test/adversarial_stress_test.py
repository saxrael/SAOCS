import sys 
import ctypes 
import random 
from typing import List ,Tuple ,Optional ,Dict 
msvcrt =ctypes .cdll .msvcrt 
sscanf =msvcrt .sscanf 
sscanf .argtypes =[ctypes .c_char_p ,ctypes .c_char_p ]
sscanf .restype =ctypes .c_int 
RELAY_COUNT =4 
RELAY_COOLDOWN_MS =1000 
def u32 (val :int )->int :
    return val &0xFFFFFFFF 
def u32_sub (a :int ,b :int )->int :
    return (a -b )&0xFFFFFFFF 
class RelayChannel :
    def __init__ (self ):
        self .current_state :bool =False 
        self .cooldown_start_ms :int =0 
        self .has_pending :bool =False 
        self .pending_state :bool =False 
        self .actuation_history :List [Tuple [int ,bool ]]=[]
class RelaysSimulator :
    def __init__ (self ):
        self .channels =[RelayChannel ()for _ in range (RELAY_COUNT )]
        self .gpio_pins =[16 ,17 ,18 ,19 ]
        self .pin_levels =[0 ]*RELAY_COUNT 
        self .storage =[False ]*RELAY_COUNT 
    def begin (self ):
        for i in range (RELAY_COUNT ):
            self .pin_levels [i ]=0 
            self .channels [i ].current_state =False 
            self .channels [i ].cooldown_start_ms =0 
            self .channels [i ].has_pending =False 
            self .channels [i ].pending_state =False 
            self .channels [i ].actuation_history .clear ()
    def apply (self ,channel :int ,new_state :bool ,now_ms :int ):
        self .channels [channel ].current_state =new_state 
        self .pin_levels [channel ]=1 if new_state else 0 
        self .storage [channel ]=new_state 
        self .channels [channel ].actuation_history .append ((now_ms ,new_state ))
    def request_state_change (self ,channel :int ,new_state :bool ,now_ms :int ):
        if channel >=RELAY_COUNT :
            return 
        if self .channels [channel ].cooldown_start_ms !=0 :
            self .channels [channel ].has_pending =True 
            self .channels [channel ].pending_state =new_state 
            return 
        if new_state ==self .channels [channel ].current_state :
            return 
        self .apply (channel ,new_state ,now_ms )
        now =u32 (now_ms )
        if now ==0 :
            now =1 
        self .channels [channel ].cooldown_start_ms =now 
        self .channels [channel ].has_pending =False 
    def tick (self ,now_ms :int ):
        now =u32 (now_ms )
        if now ==0 :
            now =1 
        for i in range (RELAY_COUNT ):
            if self .channels [i ].cooldown_start_ms ==0 :
                continue 
            elapsed =u32_sub (now ,self .channels [i ].cooldown_start_ms )
            if elapsed >=RELAY_COOLDOWN_MS :
                self .channels [i ].cooldown_start_ms =0 
                if self .channels [i ].has_pending :
                    next_state =self .channels [i ].pending_state 
                    self .channels [i ].has_pending =False 
                    if next_state !=self .channels [i ].current_state :
                        self .apply (i ,next_state ,now_ms )
                        apply_now =u32 (now_ms )
                        if apply_now ==0 :
                            apply_now =1 
                        self .channels [i ].cooldown_start_ms =apply_now 
    def get_state (self ,channel :int )->bool :
        if channel >=RELAY_COUNT :
            return False 
        return self .channels [channel ].current_state 
    def has_pending (self ,channel :int )->bool :
        if channel >=RELAY_COUNT :
            return False 
        return self .channels [channel ].has_pending 
    def get_pending_state (self ,channel :int )->bool :
        if channel >=RELAY_COUNT :
            return False 
        return self .channels [channel ].pending_state 
    def get_cooldown_remaining_ms (self ,channel :int ,now_ms :int )->int :
        if channel >=RELAY_COUNT or self .channels [channel ].cooldown_start_ms ==0 :
            return 0 
        elapsed =u32_sub (u32 (now_ms ),self .channels [channel ].cooldown_start_ms )
        if elapsed >=RELAY_COOLDOWN_MS :
            return 0 
        return RELAY_COOLDOWN_MS -elapsed 
class SerialHarnessSimulator :
    def __init__ (self ,relays :RelaysSimulator ):
        self .relays =relays 
        self .line_buf =bytearray (64 )
        self .line_len =0 
        self .output_lines :List [str ]=[]
        self .current_time_ms :int =1000 
    def feed_bytes (self ,data :bytes ):
        for b in data :
            c =bytes ([b ])
            if c in (b'\r',b'\n'):
                if self .line_len >0 :
                    raw_bytes =bytes (self .line_buf [:self .line_len ])
                    self .line_len =0 
                    self .process_command (raw_bytes )
            else :
                if self .line_len <63 :
                    self .line_buf [self .line_len ]=b 
                    self .line_len +=1 
    def process_command (self ,raw_bytes :bytes ):
        raw_str =raw_bytes .decode ('latin1',errors ='replace')
        cmd_str =raw_str .lstrip (' \t').rstrip (' \t\r\n')
        if not cmd_str :
            return 
        if cmd_str =="STATUS":
            for i in range (RELAY_COUNT ):
                ch =i +1 
                st =self .relays .get_state (i )
                if self .relays .has_pending (i ):
                    pend =self .relays .get_pending_state (i )
                    rem =self .relays .get_cooldown_remaining_ms (i ,self .current_time_ms )
                    self .output_lines .append (f"CH{ch }: {'ON'if st else 'OFF'} (pending: {'ON'if pend else 'OFF'}, cooldown: {rem }ms remaining)")
                else :
                    self .output_lines .append (f"CH{ch }: {'ON'if st else 'OFF'} (no pending)")
            return 
        cmd_cstr =cmd_str .encode ('latin1')
        ch =ctypes .c_int (0 )
        action =ctypes .create_string_buffer (8 )
        extra =ctypes .c_char (b'\0')
        fmt_relay =b"RELAY %d %7s %c"
        matched =sscanf (cmd_cstr ,fmt_relay ,ctypes .byref (ch ),action ,ctypes .byref (extra ))
        if matched ==2 and 1 <=ch .value <=RELAY_COUNT :
            act =action .value .decode ('latin1',errors ='replace')
            if act =="ON":
                self .relays .request_state_change (ch .value -1 ,True ,self .current_time_ms )
                self .output_lines .append (f"OK RELAY {ch .value } ON")
                return 
            if act =="OFF":
                self .relays .request_state_change (ch .value -1 ,False ,self .current_time_ms )
                self .output_lines .append (f"OK RELAY {ch .value } OFF")
                return 
        fmt_toggle =b"TOGGLE %d %c"
        matched =sscanf (cmd_cstr ,fmt_toggle ,ctypes .byref (ch ),ctypes .byref (extra ))
        if matched ==1 and 1 <=ch .value <=RELAY_COUNT :
            channel_index =ch .value -1 
            cur =self .relays .get_state (channel_index )
            self .relays .request_state_change (channel_index ,not cur ,self .current_time_ms )
            self .output_lines .append (f"OK TOGGLE {ch .value } -> {'OFF'if cur else 'ON'}")
            return 
        self .output_lines .append ("ERR UNKNOWN CMD")
def run_tests ()->bool :
    all_passed =True 
    print ("==================================================")
    print ("STARTING ADVERSARIAL STRESS TEST SUITE")
    print ("==================================================")
    print ("\n--- TEST SUITE 1: Timing Boundary ---")
    sim =RelaysSimulator ()
    sim .begin ()
    t0 =1000 
    sim .request_state_change (0 ,True ,t0 )
    assert sim .get_state (0 )==True ,"FAIL 1.1: State not applied"
    assert sim .channels [0 ].cooldown_start_ms ==t0 ,"FAIL 1.1: Cooldown start not set"
    assert not sim .has_pending (0 ),"FAIL 1.1: Should not have pending"
    print ("PASS 1.1: Initial actuation applied at t=1000ms")
    sim .request_state_change (0 ,False ,1500 )
    assert sim .get_state (0 )==True ,"FAIL 1.2: Current state changed during cooldown"
    assert sim .has_pending (0 )==True ,"FAIL 1.2: Pending state not queued"
    assert sim .get_pending_state (0 )==False ,"FAIL 1.2: Pending state value incorrect"
    print ("PASS 1.2: Opposite state queued at t=1500ms (cooldown active)")
    sim .tick (1999 )
    assert sim .get_state (0 )==True ,"FAIL 1.3: State prematurely applied at 999ms!"
    assert sim .has_pending (0 )==True ,"FAIL 1.3: Pending cleared at 999ms!"
    assert sim .get_cooldown_remaining_ms (0 ,1999 )==1 ,f"FAIL 1.3: Remaining ms expected 1, got {sim .get_cooldown_remaining_ms (0 ,1999 )}"
    print ("PASS 1.3: tick() correctly holds pending state at 999ms elapsed")
    sim .tick (2000 )
    assert sim .get_state (0 )==False ,"FAIL 1.4: Pending state not applied at 1000ms!"
    assert sim .has_pending (0 )==False ,"FAIL 1.4: has_pending should be cleared"
    print ("PASS 1.4: tick() correctly releases and applies at exactly 1000ms elapsed")
    assert sim .channels [0 ].cooldown_start_ms ==2000 ,f"FAIL 1.5: Cooldown timer was not restarted (got {sim .channels [0 ].cooldown_start_ms })"
    sim .request_state_change (0 ,True ,2050 )
    assert sim .get_state (0 )==False ,"FAIL 1.5: Immediate change applied without cooldown!"
    assert sim .has_pending (0 )==True ,"FAIL 1.5: State should be queued"
    sim .tick (2999 )
    assert sim .get_state (0 )==False ,"FAIL 1.5: Premature release of second actuation"
    sim .tick (3000 )
    assert sim .get_state (0 )==True ,"FAIL 1.5: Second actuation not applied at t=3000"
    print ("PASS 1.5: Applying queued state successfully restarts cooldown timer (protects contacts)")
    sim .request_state_change (0 ,False ,3100 )
    sim .request_state_change (0 ,True ,3200 )
    assert sim .channels [0 ].pending_state ==True 
    sim .tick (4000 )
    assert sim .get_state (0 )==True 
    assert sim .channels [0 ].cooldown_start_ms ==0 ,"FAIL 1.6: Cooldown should be 0 when no physical actuation occurred"
    print ("PASS 1.6: Idempotent queue overwrite avoids redundant physical actuation and cooldown")
    print ("\n--- TEST SUITE 2: millis() Rollover Stress ---")
    sim .begin ()
    start_t =0xFFFFFFFF -500 
    sim .request_state_change (1 ,True ,start_t )
    assert sim .channels [1 ].cooldown_start_ms ==start_t 
    sim .request_state_change (1 ,False ,0xFFFFFFFF -100 )
    assert sim .has_pending (1 )==True 
    sim .tick (0xFFFFFFFF )
    assert sim .get_state (1 )==True 
    assert sim .has_pending (1 )==True 
    rem =sim .get_cooldown_remaining_ms (1 ,0xFFFFFFFF )
    assert rem ==500 ,f"FAIL 2.1: Expected 500ms remaining, got {rem }"
    sim .tick (0 )
    assert sim .get_state (1 )==True 
    assert sim .has_pending (1 )==True 
    sim .tick (498 )
    assert sim .get_state (1 )==True ,"FAIL 2.1: premature apply across rollover at 999ms elapsed"
    assert sim .has_pending (1 )==True 
    sim .tick (499 )
    assert sim .get_state (1 )==False ,"FAIL 2.1: Failed to apply across rollover at 1000ms elapsed"
    assert sim .has_pending (1 )==False 
    assert sim .channels [1 ].cooldown_start_ms ==499 
    print ("PASS 2.1: Cooldown holds at 999ms and releases at 1000ms across 0xFFFFFFFF rollover")
    sim .begin ()
    sim .request_state_change (2 ,True ,0xFFFFFFFF )
    sim .request_state_change (2 ,False ,0xFFFFFFFF )
    assert sim .has_pending (2 )==True 
    sim .tick (998 )
    assert sim .get_state (2 )==True 
    assert sim .has_pending (2 )==True 
    sim .tick (999 )
    assert sim .get_state (2 )==False 
    assert sim .has_pending (2 )==False 
    print ("PASS 2.2: Cooldown initiated exactly at 0xFFFFFFFF wraps and releases at now=999")
    sim .begin ()
    sim .request_state_change (3 ,True ,0 )
    assert sim .channels [3 ].cooldown_start_ms ==1 ,"FAIL 2.3: Cooldown start ms not mapped from 0 to 1"
    sim .request_state_change (3 ,False ,50 )
    sim .tick (1000 )
    assert sim .get_state (3 )==True 
    assert sim .has_pending (3 )==True 
    sim .tick (1001 )
    assert sim .get_state (3 )==False 
    assert sim .has_pending (3 )==False 
    print ("PASS 2.3: Cooldown started at millis() == 0 handles sentinel seamlessly")
    sim .begin ()
    for offset in range (-100 ,100 ):
        c_start =u32 (0xFFFFFFFF +offset )
        if c_start ==0 :
            c_start =1 
        sim .channels [0 ].cooldown_start_ms =c_start 
        sim .channels [0 ].current_state =True 
        sim .channels [0 ].has_pending =True 
        sim .channels [0 ].pending_state =False 
        t_999 =u32 (c_start +999 )
        sim .tick (t_999 )
        assert sim .get_state (0 )==True ,f"FAIL 2.4: Premature release at offset {offset }"
        t_1000 =u32 (c_start +1000 )
        sim .tick (t_1000 )
        assert sim .get_state (0 )==False ,f"FAIL 2.4: Failed release at offset {offset }"
    print ("PASS 2.4: Exhaustive boundary sweep (-100 to +100 around rollover) all passed")
    print ("\n--- TEST SUITE 3: Buffer & Parsing Stress ---")
    harness =SerialHarnessSimulator (sim )
    malformed_cases =[
    ("RELAY 5 ON","ERR UNKNOWN CMD"),
    ("RELAY 0 ON","ERR UNKNOWN CMD"),
    ("RELAY -1 ON","ERR UNKNOWN CMD"),
    ("RELAY 100 ON","ERR UNKNOWN CMD"),
    ("TOGGLE 99","ERR UNKNOWN CMD"),
    ("TOGGLE 0","ERR UNKNOWN CMD"),
    ("TOGGLE -1","ERR UNKNOWN CMD"),
    ("FOOBAR","ERR UNKNOWN CMD"),
    ("STATUS EXTRA","ERR UNKNOWN CMD"),
    ("RELAY 1 ON EXTRA","ERR UNKNOWN CMD"),
    ("TOGGLE 1 EXTRA","ERR UNKNOWN CMD"),
    ("RELAY 1 INVALID","ERR UNKNOWN CMD"),
    ("RELAY 1 ONNNNNNNNNNN","ERR UNKNOWN CMD"),
    ("RELAY 1","ERR UNKNOWN CMD"),
    ("RELAY","ERR UNKNOWN CMD"),
    ("TOGGLE","ERR UNKNOWN CMD"),
    ("RELAY -2147483648 ON","ERR UNKNOWN CMD"),
    ("RELAY 2147483647 ON","ERR UNKNOWN CMD"),
    ]
    for cmd ,expected in malformed_cases :
        harness .output_lines .clear ()
        harness .feed_bytes (f"{cmd }\n".encode ('latin1'))
        assert len (harness .output_lines )==1 ,f"FAIL 3.1: Expected 1 line for '{cmd }', got {harness .output_lines }"
        assert harness .output_lines [0 ]==expected ,f"FAIL 3.1: For '{cmd }', expected '{expected }', got '{harness .output_lines [0 ]}'"
    print (f"PASS 3.1: All {len (malformed_cases )} malformed commands correctly rejected with ERR UNKNOWN CMD")
    harness .output_lines .clear ()
    harness .feed_bytes (b"\n\r\n   \n\t\t\n")
    assert len (harness .output_lines )==0 ,f"FAIL 3.2: Empty lines produced output: {harness .output_lines }"
    print ("PASS 3.2: Empty lines and whitespace-only lines silently ignored")
    whitespace_valid =[
    ("   RELAY   1   ON   ","OK RELAY 1 ON"),
    ("\tRELAY\t2\tOFF\t","OK RELAY 2 OFF"),
    ("  TOGGLE   3  ","OK TOGGLE 3 -> ON"),
    ("   STATUS   ","CH1:"),
    ]
    for cmd ,expected_prefix in whitespace_valid :
        harness .output_lines .clear ()
        harness .feed_bytes (f"{cmd }\n".encode ('latin1'))
        assert len (harness .output_lines )>=1 ,f"FAIL 3.3: No output for '{cmd }'"
        assert harness .output_lines [0 ].startswith (expected_prefix ),f"FAIL 3.3: Output '{harness .output_lines [0 ]}' does not start with '{expected_prefix }'"
    print ("PASS 3.3: Multiple spaces and tabs successfully handled for valid commands")
    oversized_cases =[
    "A"*65 ,
    "RELAY 1 ON "+("x"*60 ),
    "RELAY "+("9"*70 )+" ON",
    "STATUS "+(" "*80 ),
    "X"*1024 ,
    "TOGGLE "+("1"*200 ),
    ]
    for cmd in oversized_cases :
        harness .output_lines .clear ()
        harness .feed_bytes (f"{cmd }\n".encode ('latin1'))
        for out in harness .output_lines :
            assert "ERR"in out or "OK"in out or "CH"in out 
    print (f"PASS 3.4: Oversized serial commands (up to 1024 chars) handled without buffer overrun or crash")
    harness .output_lines .clear ()
    harness .feed_bytes (b"RE")
    harness .feed_bytes (b"LAY 4 ")
    harness .feed_bytes (b"ON\r")
    harness .feed_bytes (b"\n")
    assert len (harness .output_lines )==1 
    assert harness .output_lines [0 ]=="OK RELAY 4 ON"
    print ("PASS 3.5: Chunked serial transmission parsed correctly across buffer boundaries")
    print ("\n--- TEST SUITE 4: Rapid Burst Stress ---")
    sim .begin ()
    harness =SerialHarnessSimulator (sim )
    harness .output_lines .clear ()
    burst_commands =[]
    for i in range (100 ):
        ch =(i %RELAY_COUNT )+1 
        act ="ON"if (i %2 ==0 )else "OFF"
        burst_commands .append ((ch ,act ))
    start_time =1000 
    for idx ,(ch ,act )in enumerate (burst_commands ):
        harness .current_time_ms =start_time +(idx *10 //100 )
        harness .feed_bytes (f"RELAY {ch } {act }\n".encode ('latin1'))
    assert len (harness .output_lines )==100 ,f"FAIL 4.1: Expected 100 ACK lines, got {len (harness .output_lines )}"
    for ch_idx in range (RELAY_COUNT ):
        actuations =sim .channels [ch_idx ].actuation_history 
        assert len (actuations )<=1 ,f"FAIL 4.1: Channel {ch_idx } actuated {len (actuations )} times during burst! (Max allowed: 1)"
    print ("PASS 4.1a: 100 rapid commands in 10ms: zero contact chatter during cooldown (max 1 actuation per ch)")
    sim .tick (1999 )
    for ch_idx in range (RELAY_COUNT ):
        assert len (sim .channels [ch_idx ].actuation_history )<=1 ,f"FAIL 4.1b: Premature actuation at t=1999ms"
    sim .tick (2000 )
    for ch_idx in range (RELAY_COUNT ):
        actuations =sim .channels [ch_idx ].actuation_history 
        if len (actuations )>1 :
            delta_t =actuations [1 ][0 ]-actuations [0 ][0 ]
            assert delta_t >=1000 ,f"FAIL 4.1c: Contact switching interval violation on ch {ch_idx }: {delta_t }ms < 1000ms"
    print ("PASS 4.1b: Debounce queue releases at 1000ms: contact switching interval >= 1000ms strictly enforced")
    print ("\n--- TEST SUITE 4.2: 10,000 Randomized Commands Fuzzing ---")
    sim .begin ()
    harness =SerialHarnessSimulator (sim )
    curr_t =10000 
    commands_sent =0 
    total_commands =10000 
    for _ in range (total_commands ):
        time_step =random .choice ([0 ,1 ,5 ,50 ,100 ,500 ,999 ,1000 ,1001 ,2000 ])
        curr_t =u32 (curr_t +time_step )
        if curr_t ==0 :
            curr_t =1 
        harness .current_time_ms =curr_t 
        sim .tick (curr_t )
        cmd_type =random .choice (["RELAY","TOGGLE","STATUS","INVALID","EMPTY"])
        if cmd_type =="RELAY":
            ch =random .randint (1 ,5 )
            act =random .choice (["ON","OFF","GARBAGE"])
            harness .feed_bytes (f"RELAY {ch } {act }\n".encode ('latin1'))
        elif cmd_type =="TOGGLE":
            ch =random .randint (0 ,5 )
            harness .feed_bytes (f"TOGGLE {ch }\n".encode ('latin1'))
        elif cmd_type =="STATUS":
            harness .feed_bytes (b"STATUS\n")
        elif cmd_type =="INVALID":
            harness .feed_bytes (b"RANDOM_JUNK\n")
        elif cmd_type =="EMPTY":
            harness .feed_bytes (b"   \n")
        commands_sent +=1 
    for _ in range (5 ):
        curr_t =u32 (curr_t +1000 )
        sim .tick (curr_t )
    for ch_idx in range (RELAY_COUNT ):
        history =sim .channels [ch_idx ].actuation_history 
        for k in range (1 ,len (history )):
            prev_t ,prev_st =history [k -1 ]
            this_t ,this_st =history [k ]
            diff =u32_sub (this_t ,prev_t )
            assert diff >=1000 ,f"CRITICAL FAULT: Contact interval violation on channel {ch_idx }: {diff }ms between actuations!"
            assert prev_st !=this_st ,f"CRITICAL FAULT: Redundant actuation without state change on channel {ch_idx }!"
    print (f"PASS 4.2: 10,000 randomized command fuzzing completed with ZERO invariant violations.")
    print ("All physical contact protection constraints strictly preserved.")
    print ("\n==================================================")
    print ("ALL 4 ADVERSARIAL STRESS TEST SUITES PASSED!")
    print ("==================================================")
    return True 
if __name__ =="__main__":
    success =run_tests ()
    sys .exit (0 if success else 1 )
