# MCOB032 memo notes (condensed from the lecturer's memos; how she marks)

Marking style: about 1 mark per correct point; scenario questions need the point explained AND applied. Calculations: show each step; subnet tables earn 0.5 per correct cell, write full IP addresses.
ERRATUM: past memos printed "(2^6) - 2 = 64 - 2 = 60 hosts". That is a typo: 2^6 - 2 = 62. Always give 62.

## Formative Test 2 (2025) - Modules 6-7, 8-9, 11
- Data link sublayers (scenario: IPv4 + IPv6 on one Ethernet link; Wi-Fi collisions): LLC lets IPv4 and IPv6 share the same NIC/medium; MAC handles access to the shared half-duplex medium; MAC adds source/destination addresses; MAC does error detection (FCS).
- Contention vs controlled access (Ethernet/WLAN vs Token Ring): Ethernet/WLAN = contention-based; Token Ring = controlled. Contention resolves collisions with CSMA/CD (detect, random back-off, retransmit) or CSMA/CA (avoid by waiting/announcing before sending). Controlled is less efficient: devices wait their turn even when the medium is idle. 50 Wi-Fi users: contention (CSMA/CA) - WLANs share the medium dynamically; controlled would be too slow.
- Multicast vs broadcast MAC: broadcast frame is received and processed by every device on the LAN; multicast frame only by devices in that multicast group. Video conferencing: multicast - one stream reaches many recipients (saves bandwidth, switches replicate as needed) and only group members receive it (group communication).
- Store-and-forward vs cut-through at 10/40 Gbps: S&F reads the whole frame, checks the FCS, discards corrupted frames - more latency, more reliable (finance/medical where integrity matters). Cut-through forwards after reading the destination MAC - lowest latency, suits high-speed time-sensitive networks, but can propagate corrupted frames. Trade-off: reliability vs latency.
- Half duplex: both can send and receive but not at the same time; one at a time on the shared medium (WLANs, hubs). Full duplex: both send and receive simultaneously; switches default to full duplex (half only if connected to a hub).
- IP characteristics (0.5 name + 0.5 explanation each): connectionless (no connection set up before sending), best effort (unreliable, delivery not guaranteed), media independent (works regardless of the underlying media).
- IPv4 challenges: address depletion (~4 billion addresses, growing devices); lack of end-to-end connectivity (NAT hides internal hosts); increased complexity (NAT adds latency and makes troubleshooting harder; meant only as a transition to IPv6).
- IPv6 improvements: increased address space (128-bit vs 32-bit); improved packet handling (simplified header, fewer fields); eliminates the need for NAT (end-to-end connectivity restored).
- ARP scenario (PC1 192.168.1.10/24 to PC2 192.168.1.20/24 on the same LAN): protocol ARP; ARP request is a broadcast; PC2 replies (unicast) with its MAC address; needed because the MAC is required to build the Layer 2 Ethernet frame that carries the IPv4 packet.
- ARP security risk: ARP spoofing / ARP poisoning - the attacker replies to an ARP request for another device's IP (e.g. the default gateway) with its own MAC; victims store the wrong MAC and send traffic to the attacker.
- ICMPv6: NS/NA = device-to-device messaging such as address resolution (like ARP). RS/RA = between devices and routers; router discovery, dynamic addressing and SLAAC.
- Address type matching: 10.20.4.0/22 network address; 192.168.10.33/27 private host; 198.51.100.75/26 public host; 192.168.10.63/27 broadcast; 172.31.5.100/16 private host; 192.168.10.255/24 broadcast.
- Subnetting 192.168.17.0/24, max 54 hosts per department: binary mask 11111111.11111111.11111111.11000000; 2^2 = 4 subnets; 2^6 - 2 = 62 hosts; 255.255.255.192 = /26; magic number 64. Table: .0 (.1-.62, bc .63); .64 (.65-.126, bc .127); .128 (.129-.190, bc .191); .192 (.193-.254, bc .255).

## Formative Test 2 (2024)
- Bus topology: all devices share one central cable; a frame sent is seen by every device. Challenge: collisions when two send at once, handled by CSMA/CD - listen until idle, on collision stop, wait a random time, retry.
- Wi-Fi warehouse: the data link layer uses CSMA/CA - listen for an idle channel, send RTS, wait for CTS, then transmit. CSMA/CD detects collisions in wired Ethernet and retries after random back-off; CSMA/CA avoids collisions because wireless devices can't listen while transmitting (hidden node problem); each transmission announces its duration so others wait.
- Unicast/broadcast/multicast frames: unicast to one MAC, switch uses its MAC table; broadcast FF:FF:FF:FF:FF:FF flooded out all ports except the ingress port; multicast MAC starts 01:00:5E (IPv4), treated like broadcast unless multicast snooping is on. Best for video conferencing: multicast.
- Switch learning: learns the SOURCE MAC and ingress port of each frame into its MAC table; known destination - forward out that port; unknown destination - flood all ports except the ingress port.
- Simple parity: 1001010 with even parity -> 10010101 (parity bit appended). If the first two 0s flip to 1s -> 11110101 received. No parity error is detected, because simple parity only detects an odd number of bit errors.
- ARP process when PC-A only knows PC-C's IPv4 address: no ARP table entry, so an ARP request is sent inside an Ethernet frame (no IPv4 header). Destination MAC = broadcast FF-FF-FF-FF-FF-FF; source MAC = sender; EtherType 0x806. The switch floods it out all ports except the receiving one; every NIC processes it; routers don't forward broadcasts; only the device with the matching IPv4 address replies.
- IPv6 address resolution messages: PC1 sends ICMPv6 Neighbor Solicitation; PC2 replies with Neighbor Advertisement.
- Subnetting 192.168.20.0/24, max 45 hosts: /26, 255.255.255.192, 4 subnets, 62 hosts each, magic number 64; same four-row table pattern (.0/.64/.128/.192).

## 2025 exam (final) - structure
Section A theory (36): network design for video + file sharing (switch/router selection factors, redundancy); DNS (MX for mail, A for web; resolution root -> TLD -> authoritative, cached; nslookup); contention vs controlled access; store-and-forward vs cut-through at 10/40 Gbps; cloud computing for a multi-branch clinic (remote access, backups/disaster recovery, availability, security, cost, scalability); PDUs (segment, packet, frame). Section B: subnetting 192.168.20.0/24 for 30 hosts (/27, 8 subnets, 30 hosts, magic 32, binary 11100000) with full table.

## Formative Test 3 (2026) - sliding window
Station A sends bytes 2001-2400, 2401-2600, 2601-2800; the second is lost. B receives 2001-2400, holds 2601-2800 in its buffer, sends ACK 2401 (next byte expected). A retransmits 2401-2600. B now has 2001-2800 in order and sends ACK 2801.

## Exam scope notes (cheat sheet)
Modules 7 (Ethernet switching), 8 (network layer), 9 (address resolution), 11 (IPv4 addressing), 12 (IPv6 addressing). Ports/memory: port-based vs shared memory buffering; duplex mismatch causes collisions; auto-MDIX. IPv4 router can fragment, IPv6 doesn't fragment in transit. Static vs dynamic routing (OSPF). Private ranges 10/8, 172.16/12, 192.168/16; loopback 127.0.0.1; APIPA 169.254/16; classes A 1-127, B 128-191, C 192-223, D 224-239. IPv6 compression: drop leading zeros; :: once only. GUA 2000::/3, LLA FE80::/10.
